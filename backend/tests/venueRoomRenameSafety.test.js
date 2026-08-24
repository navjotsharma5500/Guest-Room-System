import request from "supertest";
import app from "../index.js";
import VenueConfig from "../models/VenueConfig.js";
import VenueBooking from "../models/VenueBooking.js";
import User from "../models/User.js";
import * as db from "./db-handler.js";

let adminToken;

beforeAll(async () => {
  await db.connect();

  await User.create({
    name: "Venue Rename Admin",
    email: "venue-rename-admin@test.com",
    password: "password123",
    role: "admin",
  });

  const loginRes = await request(app).post("/api/auth/login").send({
    email: "venue-rename-admin@test.com",
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
            rooms: [{ id: "room-101", name: "Room 101", enabled: true }],
          },
        ],
      },
    ],
  });

// Simulates a booking created before stable venue identity existed: only
// hall/roomNo strings, no venueRoomId etc.
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

const renameRoom = (name) =>
  request(app)
    .patch("/api/venue-config/room")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ roomId: "room-101", sectionId: "lecture-theatre", name });

const createBooking = (payload) =>
  request(app)
    .post("/api/venue-bookings")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      rooms: [{ hall: "Lecture Theatre", roomNo: "Room 101-A" }],
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

describe("Venue room rename — booking conflict safety", () => {
  it("still blocks a new booking for the renamed room when a legacy booking under the OLD name overlaps", async () => {
    await seedConfig();
    await createLegacyBooking(); // "Room 101", Sep 10-12, 10:00-16:00 — still active/upcoming

    const renameRes = await renameRoom("Room 101-A");
    expect(renameRes.status).toBe(200);

    // New booking request uses the room's NEW name and overlaps the legacy
    // (old-name) booking's window — this must be rejected, not silently
    // allowed to double-book the same physical room.
    const res = await createBooking({
      checkInDate: "2026-09-11",
      checkInTime: "12:00",
      checkOutDate: "2026-09-11",
      checkOutTime: "14:00",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Time overlap detected/i);

    const bookingsForNewName = await VenueBooking.find({ roomNo: "Room 101-A" });
    expect(bookingsForNewName).toHaveLength(0);
  });

  it("allows a genuinely non-overlapping new booking for the renamed room and saves stable venue identity", async () => {
    await seedConfig();
    await createLegacyBooking(); // Sep 10-12, 10:00-16:00

    await renameRoom("Room 101-A");

    // Same physical room, but a window that does not overlap the legacy booking.
    const res = await createBooking({
      checkInDate: "2026-09-20",
      checkInTime: "09:00",
      checkOutDate: "2026-09-20",
      checkOutTime: "11:00",
    });

    expect(res.status).toBe(201);
    const created = res.body.bookings[0];
    expect(created.hall).toBe("Lecture Theatre");
    expect(created.roomNo).toBe("Room 101-A");
    // New bookings resolve and persist stable VenueConfig identity.
    expect(created.venueRoomId).toBe("room-101");
    expect(created.venueSectionId).toBe("lecture-theatre");
    expect(created.venueMainTabId).toBe("rooms");
  });

  it("does not create a double-booking path: pre- and post-rename conflict checks agree on the same physical room", async () => {
    await seedConfig();

    // First booking made under the CURRENT (pre-rename) name.
    const firstRes = await request(app)
      .post("/api/venue-bookings")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        rooms: [{ hall: "Lecture Theatre", roomNo: "Room 101" }],
        name: "First Booker",
        eventName: "First Event",
        email: "first@thapar.edu",
        checkInDate: "2026-10-01",
        checkInTime: "10:00",
        checkOutDate: "2026-10-01",
        checkOutTime: "16:00",
        bookingFor: "institute_calendar",
        attachments: ["http://test.com/consent.pdf"],
      });
    expect(firstRes.status).toBe(201);

    await renameRoom("Room 101-A");

    // A second, overlapping request under the NEW name must still be blocked.
    const secondRes = await createBooking({
      checkInDate: "2026-10-01",
      checkInTime: "11:00",
      checkOutDate: "2026-10-01",
      checkOutTime: "13:00",
    });

    expect(secondRes.status).toBe(400);
  });

  it("keeps a completed historical booking fully readable after the room is renamed", async () => {
    await seedConfig();
    const historical = await createLegacyBooking({
      status: "completed",
      checkInDate: "2020-01-01",
      checkOutDate: "2020-01-02",
      name: "Historical Booker",
    });

    await renameRoom("Room 101-A");

    const res = await request(app)
      .get(`/api/venue-bookings/${historical._id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.hall).toBe("Lecture Theatre");
    expect(res.body.roomNo).toBe("Room 101"); // untouched — old name preserved verbatim
    expect(res.body.status).toBe("completed");
    expect(res.body.name).toBe("Historical Booker");
  });

  it("records the outgoing name in the room's previousNames on rename, without altering any booking documents", async () => {
    await seedConfig();
    await createLegacyBooking();

    await renameRoom("Room 101-A");

    const config = await VenueConfig.findOne({ key: "global" }).lean();
    const room = config.mainTabs[0].sections[0].rooms[0];
    expect(room.name).toBe("Room 101-A");
    expect(room.previousNames).toContain("Room 101");

    const legacyBooking = await VenueBooking.findOne({ roomNo: "Room 101" }).lean();
    expect(legacyBooking).not.toBeNull();
    expect(legacyBooking.hall).toBe("Lecture Theatre");
    expect(legacyBooking.roomNo).toBe("Room 101");
  });
});
