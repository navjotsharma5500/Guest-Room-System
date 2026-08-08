import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";

process.env.NODE_ENV = "test";
process.env.VENUE_API_KEY = "venue-integration-test-key";

const app = (await import("../index.js")).default;
const VenueBooking = (await import("../models/VenueBooking.js")).default;
const VenueConfig = (await import("../models/VenueConfig.js")).default;
const VenueEnquiry = (await import("../models/VenueEnquiry.js")).default;

let mongoServer;

const apiKey = process.env.VENUE_API_KEY;
const availabilityPath =
  "/api/integration/venues?fromDate=2026-08-05&toDate=2026-08-05&startTime=18:00&endTime=22:00";

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  await VenueConfig.create({
    mainTabs: [
      {
        id: "auditoriums",
        label: "Auditorium / Halls",
        enabled: true,
        sections: [
          {
            id: "auditorium-list",
            label: "Auditoriums",
            enabled: true,
            rooms: [
              { id: "main-auditorium", name: "Main Auditorium", enabled: true },
              { id: "c-hall", name: "C-Hall", enabled: true },
            ],
          },
        ],
      },
    ],
  });

  await VenueBooking.create({
    hall: "Auditoriums",
    roomNo: "Main Auditorium",
    name: "Existing Booker",
    eventName: "Existing Event",
    email: "booker@thapar.edu",
    checkInDate: "2026-08-05",
    checkInTime: "19:00",
    checkOutDate: "2026-08-05",
    checkOutTime: "21:00",
    status: "booked",
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

test("GET availability accepts a valid API key and reports available and booked venues", async () => {
  const enquiryCount = await VenueEnquiry.countDocuments();
  const bookingCount = await VenueBooking.countDocuments();

  const response = await request(app)
    .get(availabilityPath)
    .set("x-venue-api-key", apiKey);

  expect(response.status).toBe(200);
  expect(response.body).toEqual([
    { venueName: "Main Auditorium", available: false },
    { venueName: "C-Hall", available: true },
  ]);
  expect(await VenueEnquiry.countDocuments()).toBe(enquiryCount);
  expect(await VenueBooking.countDocuments()).toBe(bookingCount);
});

test("GET availability rejects a missing API key", async () => {
  const response = await request(app).get(availabilityPath);

  expect(response.status).toBe(401);
  expect(response.body).toEqual({ success: false, message: "Missing API key" });
});

test("GET availability rejects an invalid API key", async () => {
  const response = await request(app)
    .get(availabilityPath)
    .set("x-venue-api-key", "invalid-key");

  expect(response.status).toBe(403);
  expect(response.body).toEqual({ success: false, message: "Invalid API key" });
});

test("POST booking requests return 410 and create no enquiry or booking records", async () => {
  const enquiryCount = await VenueEnquiry.countDocuments();
  const bookingCount = await VenueBooking.countDocuments();

  const response = await request(app)
    .post("/api/integration/book-room")
    .set("x-venue-api-key", apiKey)
    .send({ venueName: "C-Hall" });

  expect(response.status).toBe(410);
  expect(response.body).toEqual({
    success: false,
    message: "This integration is availability-only. Booking requests are not accepted.",
  });
  expect(await VenueEnquiry.countDocuments()).toBe(enquiryCount);
  expect(await VenueBooking.countDocuments()).toBe(bookingCount);
});
