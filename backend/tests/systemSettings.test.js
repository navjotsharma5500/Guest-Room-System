import request from "supertest";
import app from "../index.js";
import SystemSettings from "../models/SystemSettings.js";
import User from "../models/User.js";
import * as db from "./db-handler.js";

let adminToken;

beforeAll(async () => {
  await db.connect();

  await User.create({
    name: "Settings Admin",
    email: "settings-admin@test.com",
    password: "password123",
    role: "admin",
  });

  const loginRes = await request(app).post("/api/auth/login").send({
    email: "settings-admin@test.com",
    password: "password123",
  });
  adminToken = loginRes.body.token;
});

afterAll(async () => {
  await db.closeDatabase();
});

beforeEach(async () => {
  // Wipe only the settings document between tests; the admin user must survive.
  await SystemSettings.deleteMany({});
});

const seedSettings = async (overrides = {}) =>
  SystemSettings.findOneAndUpdate(
    { key: "global" },
    {
      $set: {
        bookingDays: {
          guestMaxRequestDays: 5,
          facultyStaffMaxRequestDays: 7,
          parentStudentMaxRequestDays: 4,
          managerMaxDirectBookingDays: 3,
          caretakerMaxDirectBookingDays: 3,
          ...(overrides.bookingDays || {}),
        },
        extensionRules: {
          maxExtensionRequestDays: 100,
          coWardenLevelDays: 8,
          adosaLevelDays: 15,
          adminLevelDays: 100,
          ...(overrides.extensionRules || {}),
        },
        ...overrides.rest,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

const putSettings = (payload) =>
  request(app)
    .put("/api/system-settings")
    .set("Authorization", `Bearer ${adminToken}`)
    .send(payload);

describe("System Settings — partial update validation (Co-Warden vs caretaker limit bug)", () => {
  // TEST 1 — reported production case
  it("passes when only Booking Days is submitted and persisted extensionRules already satisfy the hierarchy", async () => {
    await seedSettings({
      bookingDays: { caretakerMaxDirectBookingDays: 3 },
      extensionRules: {
        coWardenLevelDays: 8,
        adosaLevelDays: 15,
        adminLevelDays: 100,
        maxExtensionRequestDays: 100,
      },
    });

    const res = await putSettings({
      bookingDays: {
        guestMaxRequestDays: 5,
        facultyStaffMaxRequestDays: 7,
        parentStudentMaxRequestDays: 4,
        managerMaxDirectBookingDays: 3,
        caretakerMaxDirectBookingDays: 7,
      },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.settings.bookingDays.caretakerMaxDirectBookingDays).toBe(7);

    // The persisted extensionRules must be untouched — no stale default (5) participated.
    expect(res.body.settings.extensionRules.coWardenLevelDays).toBe(8);
    expect(res.body.settings.extensionRules.adosaLevelDays).toBe(15);
    expect(res.body.settings.extensionRules.adminLevelDays).toBe(100);

    const persisted = await SystemSettings.findOne({ key: "global" }).lean();
    expect(persisted.bookingDays.caretakerMaxDirectBookingDays).toBe(7);
    expect(persisted.extensionRules.coWardenLevelDays).toBe(8);
  });

  // TEST 2 — genuine invalid Booking Days update must still fail
  it("fails when the submitted caretaker limit equals the persisted Co-Warden level", async () => {
    await seedSettings({
      bookingDays: { caretakerMaxDirectBookingDays: 3 },
      extensionRules: { coWardenLevelDays: 8 },
    });

    const res = await putSettings({
      bookingDays: {
        guestMaxRequestDays: 5,
        facultyStaffMaxRequestDays: 7,
        parentStudentMaxRequestDays: 4,
        managerMaxDirectBookingDays: 3,
        caretakerMaxDirectBookingDays: 8,
      },
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe(
      "Co-Warden level must be greater than caretaker direct booking limit"
    );

    // Nothing should have been persisted.
    const persisted = await SystemSettings.findOne({ key: "global" }).lean();
    expect(persisted.bookingDays.caretakerMaxDirectBookingDays).toBe(3);
  });

  // TEST 3 — Extension Rules partial update must validate against the persisted caretaker limit, not the default (3)
  it("passes an Extension Rules-only update validated against the persisted caretaker limit", async () => {
    await seedSettings({
      bookingDays: { caretakerMaxDirectBookingDays: 7 },
      extensionRules: { coWardenLevelDays: 5 },
    });

    const res = await putSettings({
      extensionRules: {
        maxExtensionRequestDays: 100,
        coWardenLevelDays: 9,
        adosaLevelDays: 15,
        adminLevelDays: 100,
      },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.settings.extensionRules.coWardenLevelDays).toBe(9);
    // Persisted caretaker limit (7) must be what was validated against, not the module default (3).
    expect(res.body.settings.bookingDays.caretakerMaxDirectBookingDays).toBe(7);
  });

  // TEST 4 — invalid Extension Rules partial update must still fail
  it("fails an Extension Rules-only update when Co-Warden level does not exceed the persisted caretaker limit", async () => {
    await seedSettings({
      bookingDays: { caretakerMaxDirectBookingDays: 7 },
      extensionRules: { coWardenLevelDays: 9 },
    });

    const res = await putSettings({
      extensionRules: {
        maxExtensionRequestDays: 100,
        coWardenLevelDays: 7,
        adosaLevelDays: 15,
        adminLevelDays: 100,
      },
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe(
      "Co-Warden level must be greater than caretaker direct booking limit"
    );

    const persisted = await SystemSettings.findOne({ key: "global" }).lean();
    expect(persisted.extensionRules.coWardenLevelDays).toBe(9);
  });

  // TEST 5 — independent tab partial saves must not reset untouched sections
  it("preserves bookingDays, extensionRules, and emailSettings when only operations is saved", async () => {
    const seeded = await seedSettings({
      bookingDays: { caretakerMaxDirectBookingDays: 7 },
      extensionRules: { coWardenLevelDays: 8, adosaLevelDays: 15, adminLevelDays: 100 },
      rest: {
        emailSettings: {
          extensionRequest: {
            enabled: false,
            sendToRoles: ["admin"],
            ccRoles: [],
            bccRoles: [],
            customEmails: [],
          },
        },
        cleaning: { enableCleaningChecklist: false, enableCleaningRequests: true },
      },
    });

    const res = await putSettings({
      operations: {
        enableBroadcastCenter: false,
        enableCleaningWorkflow: true,
        enableGuestSupportPortal: true,
        enableHostelRatings: true,
        enableGuestFlagging: true,
      },
    });

    expect(res.status).toBe(200);
    expect(res.body.settings.operations.enableBroadcastCenter).toBe(false);

    // Untouched sections must survive exactly as seeded.
    expect(res.body.settings.bookingDays.caretakerMaxDirectBookingDays).toBe(7);
    expect(res.body.settings.extensionRules.coWardenLevelDays).toBe(8);
    expect(res.body.settings.extensionRules.adosaLevelDays).toBe(15);
    expect(res.body.settings.emailSettings.extensionRequest.enabled).toBe(false);
    expect(res.body.settings.emailSettings.extensionRequest.sendToRoles).toEqual(["admin"]);
    expect(res.body.settings.cleaning.enableCleaningChecklist).toBe(false);

    const persisted = await SystemSettings.findOne({ key: "global" }).lean();
    expect(persisted.bookingDays.caretakerMaxDirectBookingDays).toBe(7);
    expect(persisted.extensionRules.coWardenLevelDays).toBe(8);
    expect(persisted.emailSettings.extensionRequest.enabled).toBe(false);
  });
});
