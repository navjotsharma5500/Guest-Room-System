import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import Booking from "../models/Booking.js";
import BookingCounter from "../models/BookingCounter.js";

let mongoServer;

const bookingData = (guest) => ({
  guest,
  email: `${guest.toLowerCase()}@example.com`,
  contact: "9999999999",
  hostel: "Test Hostel",
  roomNo: guest,
  from: new Date("2026-07-29T00:00:00.000Z"),
  to: new Date("2026-07-30T00:00:00.000Z"),
});

const todayKey = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}${value("month")}${value("day")}`;
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await Booking.init();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await mongoose.connection.dropDatabase();
  await Booking.init();
});

test("allocates unique sequential Guest Room Booking IDs for concurrent bookings", async () => {
  const bookings = await Promise.all([
    Booking.create(bookingData("One")),
    Booking.create(bookingData("Two")),
    Booking.create(bookingData("Three")),
  ]);

  expect(bookings.map((booking) => booking.bookingId).sort()).toEqual([
    `GR-${todayKey()}01`,
    `GR-${todayKey()}02`,
    `GR-${todayKey()}03`,
  ]);
});

test("starts at 01 when only another day's counter exists", async () => {
  await BookingCounter.create({ _id: "000101", sequence: 42 });
  const booking = await Booking.create(bookingData("Next"));

  expect(booking.bookingId).toBe(`GR-${todayKey()}01`);
});

test("keeps legacy bookings without bookingId readable", async () => {
  const { insertedId } = await Booking.collection.insertOne(bookingData("Legacy"));
  const legacy = await Booking.findById(insertedId);

  expect(legacy).not.toBeNull();
  expect(legacy.bookingId).toBeUndefined();
});
