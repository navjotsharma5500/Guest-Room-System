import request from "supertest";
import app from "../index.js";
import VenueConfig from "../models/VenueConfig.js";
import VenueBooking from "../models/VenueBooking.js";
import VenueEnquiry from "../models/VenueEnquiry.js";
import User from "../models/User.js";
import * as db from "./db-handler.js";

// Matches the key used by tests/venueIntegration.test.js — process.env is a
// process-wide singleton across test files in the same Jest run, so this
// must stay in sync with that file's value rather than pick its own. The
// venue-integration middleware reads it lazily per-request, not at import
// time, so setting it here (after the static imports above) is safe.
process.env.VENUE_API_KEY = "venue-integration-test-key";
const VENUE_API_KEY = process.env.VENUE_API_KEY;

let adminToken;

beforeAll(async () => {
  await db.connect();

  await User.create({
    name: "Section Rename Admin",
    email: "section-rename-admin@test.com",
    password: "password123",
    role: "admin",
  });

  const loginRes = await request(app).post("/api/auth/login").send({
    email: "section-rename-admin@test.com",
    password: "password123",
  });
  adminToken = loginRes.body.token;
});

afterAll(async () => {
  await db.closeDatabase();
});

beforeEach(async () => {
  await VenueConfig.deleteMany({});
  await VenueBooking.deleteMany({});
  await VenueEnquiry.deleteMany({});
});

const seedConfig = async () =>
  VenueConfig.create({
    key: "global",
    mainTabs: [
      {
        id: "halls",
        label: "Halls",
        enabled: true,
        sections: [
          {
            id: "agira-hall",
            label: "Agira Hall (A)",
            enabled: true,
            rooms: [{ id: "agira-main", name: "Main Floor", enabled: true }],
          },
          {
            id: "other-hall",
            label: "Other Hall",
            enabled: true,
            rooms: [{ id: "other-main", name: "Main Floor", enabled: true }],
          },
        ],
      },
    ],
  });

const renameSection = (label) =>
  request(app)
    .patch("/api/venue-config/section")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ mainTabId: "halls", sectionId: "agira-hall", label });

const toggleSection = (enabled) =>
  request(app)
    .patch("/api/venue-config/toggle")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ mainTabId: "halls", sectionId: "agira-hall", enabled });

// A pre-rename, still-active booking — created before section rename safety
// existed, so it only ever has plain hall/roomNo strings.
const createLegacyBooking = (overrides = {}) =>
  VenueBooking.create({
    hall: "Agira Hall (A)",
    roomNo: "Main Floor",
    name: "Legacy Booker",
    eventName: "Legacy Event",
    email: "legacy@thapar.edu",
    checkInDate: "2026-09-10",
    checkInTime: "10:00",
    checkOutDate: "2026-09-12",
    checkOutTime: "16:00",
    bookingFor: "institute_calendar",
    status: "booked",
    attachments: ["http://test.com/consent.pdf"],
    ...overrides,
  });

const createBooking = (payload) =>
  request(app)
    .post("/api/venue-bookings")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      rooms: [{ hall: "Agira Hall - A", roomNo: "Main Floor" }],
      name: "New Booker",
      eventName: "New Event",
      email: "new@thapar.edu",
      checkInDate: "2026-09-11",
      checkInTime: "09:00",
      checkOutDate: "2026-09-11",
      checkOutTime: "18:00",
      bookingFor: "institute_calendar",
      attachments: ["http://test.com/consent.pdf"],
      ...payload,
    });

describe("Section rename — booking conflict safety", () => {
  it("still blocks a new booking for the renamed section when a legacy booking under the OLD hall name overlaps", async () => {
    await seedConfig();
    await createLegacyBooking(); // "Agira Hall (A)", Sep 10-12, 10:00-16:00

    const renameRes = await renameSection("Agira Hall - A");
    expect(renameRes.status).toBe(200);

    const res = await createBooking({
      checkInDate: "2026-09-11",
      checkInTime: "12:00",
      checkOutDate: "2026-09-11",
      checkOutTime: "14:00",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Time overlap detected/i);

    const bookingsForNewHall = await VenueBooking.find({ hall: "Agira Hall - A" });
    expect(bookingsForNewHall).toHaveLength(0);
  });

  it("allows a genuinely non-overlapping new booking under the renamed hall and saves stable venue identity", async () => {
    await seedConfig();
    await createLegacyBooking(); // Sep 10-12, 10:00-16:00
    await renameSection("Agira Hall - A");

    const res = await createBooking({
      checkInDate: "2026-09-20",
      checkInTime: "09:00",
      checkOutDate: "2026-09-20",
      checkOutTime: "11:00",
    });

    expect(res.status).toBe(201);
    const created = res.body.bookings[0];
    expect(created.hall).toBe("Agira Hall - A");
    expect(created.venueSectionId).toBe("agira-hall");
    expect(created.venueMainTabId).toBe("halls");
  });

  it("does not confuse a genuinely different section with the renamed one", async () => {
    await seedConfig();
    await createLegacyBooking(); // "Agira Hall (A)"
    await renameSection("Agira Hall - A");

    const res = await request(app)
      .post("/api/venue-bookings")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        rooms: [{ hall: "Other Hall", roomNo: "Main Floor" }],
        name: "Different Hall Booker",
        eventName: "Different Hall Event",
        email: "diff@thapar.edu",
        checkInDate: "2026-09-11",
        checkInTime: "12:00",
        checkOutDate: "2026-09-11",
        checkOutTime: "14:00",
        bookingFor: "institute_calendar",
        attachments: ["http://test.com/consent.pdf"],
      });

    expect(res.status).toBe(201);
  });
});

describe("Section rename — venue enquiry conflict safety", () => {
  const createEnquiry = (overrides = {}) =>
    VenueEnquiry.create({
      name: "Enquirer",
      email: "enquirer@thapar.edu",
      contact: "9876543210",
      hall: "Agira Hall - A",
      roomNo: "Main Floor",
      societyName: "Test Society",
      eventName: "Test Event",
      description: "Test description",
      checkInDate: "2026-09-11",
      checkInTime: "12:00",
      checkOutDate: "2026-09-11",
      checkOutTime: "14:00",
      status: "pending",
      ...overrides,
    });

  it("check-conflict recognizes a legacy old-hall-name booking as the same section", async () => {
    await seedConfig();
    await createLegacyBooking();
    await renameSection("Agira Hall - A");

    const enquiry = await createEnquiry();
    const res = await request(app)
      .post(`/api/venue/enquiry/${enquiry._id}/check-conflict`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        checkInDate: "2026-09-11",
        checkInTime: "12:00",
        checkOutDate: "2026-09-11",
        checkOutTime: "14:00",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/conflict/i);
  });

  it("approve rejects into the renamed section when a legacy old-hall-name booking overlaps", async () => {
    await seedConfig();
    await createLegacyBooking();
    await renameSection("Agira Hall - A");

    const enquiry = await createEnquiry();
    const res = await request(app)
      .put(`/api/venue/enquiry/${enquiry._id}/approved`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ bookingFor: "institute_calendar" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Time overlap detected/i);

    const bookingsForNewHall = await VenueBooking.find({ hall: "Agira Hall - A" });
    expect(bookingsForNewHall).toHaveLength(0);
  });
});

describe("Section rename — public availability safety", () => {
  it("reports the renamed venue as unavailable when a legacy old-hall-name booking overlaps", async () => {
    await seedConfig();
    await createLegacyBooking();
    await renameSection("Agira Hall - A");

    const res = await request(app)
      .get("/api/integration/venues")
      .set("x-venue-api-key", VENUE_API_KEY)
      .query({
        fromDate: "2026-09-11",
        toDate: "2026-09-11",
        startTime: "12:00",
        endTime: "14:00",
      });

    expect(res.status).toBe(200);
    const entry = res.body.venues.find((v) => v.venueName === "Main Floor");
    expect(entry).toBeDefined();
    expect(entry.available).toBe(false);
  });

  it("reports the renamed venue as available for a non-overlapping slot", async () => {
    await seedConfig();
    await createLegacyBooking(); // Sep 10-12, 10:00-16:00
    await renameSection("Agira Hall - A");

    const res = await request(app)
      .get("/api/integration/venues")
      .set("x-venue-api-key", VENUE_API_KEY)
      .query({
        fromDate: "2026-09-20",
        toDate: "2026-09-20",
        startTime: "09:00",
        endTime: "11:00",
      });

    expect(res.status).toBe(200);
    const entry = res.body.venues.find((v) => v.venueName === "Main Floor");
    expect(entry.available).toBe(true);
  });
});

describe("Section rename — historical data and disabled-section fallback safety", () => {
  it("keeps a completed historical booking fully readable after the section is renamed", async () => {
    await seedConfig();
    const historical = await createLegacyBooking({
      status: "completed",
      checkInDate: "2020-01-01",
      checkOutDate: "2020-01-02",
      name: "Historical Booker",
    });

    await renameSection("Agira Hall - A");

    const res = await request(app)
      .get(`/api/venue-bookings/${historical._id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.hall).toBe("Agira Hall (A)"); // untouched — old name preserved verbatim
    expect(res.body.status).toBe("completed");
    expect(res.body.name).toBe("Historical Booker");
  });

  it("records the outgoing label in the section's previousNames without altering any booking documents", async () => {
    await seedConfig();
    await createLegacyBooking();

    await renameSection("Agira Hall - A");

    const config = await VenueConfig.findOne({ key: "global" }).lean();
    const section = config.mainTabs[0].sections.find((s) => s.id === "agira-hall");
    expect(section.label).toBe("Agira Hall - A");
    expect(section.previousNames).toContain("Agira Hall (A)");

    const legacyBooking = await VenueBooking.findOne({ hall: "Agira Hall (A)" }).lean();
    expect(legacyBooking).not.toBeNull();
    expect(legacyBooking.roomNo).toBe("Main Floor");
  });

  it("a disabled section with no child rooms is excluded from public availability (no section-as-room fallback)", async () => {
    const config = await VenueConfig.create({
      key: "global",
      mainTabs: [
        {
          id: "halls",
          label: "Halls",
          enabled: true,
          sections: [
            { id: "empty-section", label: "Empty Section", enabled: false, rooms: [] },
          ],
        },
      ],
    });
    void config;

    const res = await request(app)
      .get("/api/integration/venues")
      .set("x-venue-api-key", VENUE_API_KEY)
      .query({
        fromDate: "2026-09-11",
        toDate: "2026-09-11",
        startTime: "09:00",
        endTime: "10:00",
      });

    expect(res.status).toBe(200);
    expect(res.body.venues).toEqual([]);
  });
});
