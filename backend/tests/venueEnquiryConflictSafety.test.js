import request from "supertest";
import app from "../index.js";
import VenueConfig from "../models/VenueConfig.js";
import VenueBooking from "../models/VenueBooking.js";
import VenueEnquiry from "../models/VenueEnquiry.js";
import User from "../models/User.js";
import * as db from "./db-handler.js";

let adminToken;

beforeAll(async () => {
  await db.connect();

  await User.create({
    name: "Enquiry Conflict Admin",
    email: "enquiry-conflict-admin@test.com",
    password: "password123",
    role: "admin",
  });

  const loginRes = await request(app).post("/api/auth/login").send({
    email: "enquiry-conflict-admin@test.com",
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
        id: "rooms",
        label: "Rooms",
        enabled: true,
        sections: [
          {
            id: "lecture-theatre",
            label: "Lecture Theatre",
            enabled: true,
            rooms: [
              { id: "room-101", name: "Room 101", enabled: true },
              { id: "room-202", name: "Room 202", enabled: true },
            ],
          },
        ],
      },
    ],
  });

// A pre-rename, still-active booking — created before venueRoomIdentity
// existed, so it only ever has plain hall/roomNo strings.
const createLegacyBooking = (overrides = {}) =>
  VenueBooking.create({
    hall: "Lecture Theatre",
    roomNo: "Room 101",
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

const createEnquiry = (overrides = {}) =>
  VenueEnquiry.create({
    name: "Enquirer",
    email: "enquirer@thapar.edu",
    contact: "9876543210",
    hall: "Lecture Theatre",
    roomNo: "Room 101-A",
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

const renameRoom = () =>
  request(app)
    .patch("/api/venue-config/room")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ roomId: "room-101", sectionId: "lecture-theatre", name: "Room 101-A" });

const checkConflict = (enquiryId, dates) =>
  request(app)
    .post(`/api/venue/enquiry/${enquiryId}/check-conflict`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send(dates);

const approve = (enquiryId, body = {}) =>
  request(app)
    .put(`/api/venue/enquiry/${enquiryId}/approved`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ bookingFor: "institute_calendar", ...body });

describe("Venue enquiry conflict checking — room rename safety", () => {
  it("check-conflict: a legacy booking under the OLD room name still conflicts for an enquiry on the renamed room", async () => {
    await seedConfig();
    await createLegacyBooking(); // "Room 101", Sep 10-12, 10:00-16:00
    await renameRoom();

    const enquiry = await createEnquiry({ roomNo: "Room 101-A" });

    const res = await checkConflict(enquiry._id, {
      checkInDate: "2026-09-11",
      checkInTime: "12:00",
      checkOutDate: "2026-09-11",
      checkOutTime: "14:00",
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/conflict/i);
  });

  it("approve: rejects approving an enquiry into the renamed room when a legacy old-name booking overlaps (no double booking)", async () => {
    await seedConfig();
    await createLegacyBooking(); // Sep 10-12, 10:00-16:00
    await renameRoom();

    const enquiry = await createEnquiry({
      roomNo: "Room 101-A",
      checkInDate: "2026-09-11",
      checkInTime: "11:00",
      checkOutDate: "2026-09-11",
      checkOutTime: "13:00",
    });

    const res = await approve(enquiry._id);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Time overlap detected/i);

    const bookingsForNewName = await VenueBooking.find({ roomNo: "Room 101-A" });
    expect(bookingsForNewName).toHaveLength(0);

    const refreshedEnquiry = await VenueEnquiry.findById(enquiry._id).lean();
    expect(refreshedEnquiry.status).toBe("pending");
  });

  it("a genuinely different room does not conflict", async () => {
    await seedConfig();
    await createLegacyBooking(); // "Room 101"
    await renameRoom();

    const enquiry = await createEnquiry({
      hall: "Lecture Theatre",
      roomNo: "Room 202",
      checkInDate: "2026-09-11",
      checkInTime: "12:00",
      checkOutDate: "2026-09-11",
      checkOutTime: "14:00",
    });

    const res = await checkConflict(enquiry._id, {
      checkInDate: "2026-09-11",
      checkInTime: "12:00",
      checkOutDate: "2026-09-11",
      checkOutTime: "14:00",
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/No conflicts/i);
  });

  it("non-overlapping date/time on the renamed room remains allowed and approval creates a real booking", async () => {
    await seedConfig();
    await createLegacyBooking(); // Sep 10-12, 10:00-16:00
    await renameRoom();

    const enquiry = await createEnquiry({
      roomNo: "Room 101-A",
      checkInDate: "2026-09-20",
      checkInTime: "09:00",
      checkOutDate: "2026-09-20",
      checkOutTime: "11:00",
    });

    const conflictRes = await checkConflict(enquiry._id, {
      checkInDate: "2026-09-20",
      checkInTime: "09:00",
      checkOutDate: "2026-09-20",
      checkOutTime: "11:00",
    });
    expect(conflictRes.status).toBe(200);
    expect(conflictRes.body.success).toBe(true);

    const approveRes = await approve(enquiry._id);
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.success).toBe(true);

    const created = await VenueBooking.findOne({ roomNo: "Room 101-A" }).lean();
    expect(created).not.toBeNull();
    expect(created.status).toBe("booked");
  });

  it("existing access-control / not-found behavior on the conflict endpoint is unchanged", async () => {
    await seedConfig();
    const missingIdRes = await checkConflict("64b000000000000000000000", {
      checkInDate: "2026-09-11",
      checkInTime: "12:00",
      checkOutDate: "2026-09-11",
      checkOutTime: "14:00",
    });
    expect(missingIdRes.status).toBe(404);
    expect(missingIdRes.body.success).toBe(false);
  });

  it("does not rewrite any historical enquiry or booking document while performing these checks", async () => {
    await seedConfig();
    const legacy = await createLegacyBooking();
    await renameRoom();

    const enquiry = await createEnquiry({
      roomNo: "Room 101-A",
      checkInDate: "2026-09-11",
      checkInTime: "12:00",
      checkOutDate: "2026-09-11",
      checkOutTime: "14:00",
    });

    await checkConflict(enquiry._id, {
      checkInDate: "2026-09-11",
      checkInTime: "12:00",
      checkOutDate: "2026-09-11",
      checkOutTime: "14:00",
    });
    await approve(enquiry._id);

    const legacyAfter = await VenueBooking.findById(legacy._id).lean();
    expect(legacyAfter.hall).toBe("Lecture Theatre");
    expect(legacyAfter.roomNo).toBe("Room 101");
    expect(legacyAfter.status).toBe("booked");
    expect(legacyAfter.checkInDate).toBe("2026-09-10");

    const enquiryAfter = await VenueEnquiry.findById(enquiry._id).lean();
    expect(enquiryAfter.hall).toBe("Lecture Theatre");
    expect(enquiryAfter.roomNo).toBe("Room 101-A");
    // Rejected (conflict), so it must remain untouched/pending, not silently booked.
    expect(enquiryAfter.status).toBe("pending");
  });
});
