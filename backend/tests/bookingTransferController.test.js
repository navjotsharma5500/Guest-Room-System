import mongoose from "mongoose";
import { jest } from "@jest/globals";
import { MongoMemoryServer } from "mongodb-memory-server";
import Booking from "../models/Booking.js";
import Hostel from "../models/Hostel.js";
import { transferBooking } from "../controllers/bookingController.js";

let mongoServer;

const makeResponse = () => ({
  statusCode: 200,
  body: null,
  status: jest.fn(function setStatus(code) {
    this.statusCode = code;
    return this;
  }),
  json: jest.fn(function sendJson(body) {
    this.body = body;
    return this;
  }),
});

const makeRequest = (bookingId, body, user = {}) => ({
  params: { id: String(bookingId) },
  body,
  user: {
    _id: new mongoose.Types.ObjectId(),
    name: "Transfer Admin",
    email: "admin@example.com",
    role: "admin",
    ...user,
  },
  app: {
    get: () => ({
      to: () => ({ emit: jest.fn() }),
    }),
  },
});

const indiaDateTimeParts = (value) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const part = (type) => parts.find((item) => item.type === type)?.value;
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    time: `${part("hour")}:${part("minute")}`,
  };
};

const relativeTransferParts = (minutesAgo) =>
  indiaDateTimeParts(new Date(Date.now() - (minutesAgo * 60 * 1000)));

const createHostels = () => Hostel.create([
  {
    name: "Hostel A",
    code: "A",
    caretakerEmail: "caretaker-a@example.com",
    wardenEmail: "warden-a@example.com",
    rooms: [{ roomNo: "101", guestRoom: true }],
  },
  {
    name: "Hostel B",
    code: "B",
    caretakerEmail: "caretaker-b@example.com",
    wardenEmail: "warden-b@example.com",
    rooms: [{ roomNo: "201", guestRoom: true }],
  },
  {
    name: "Hostel C",
    code: "C",
    caretakerEmail: "caretaker-c@example.com",
    wardenEmail: "warden-c@example.com",
    rooms: [{ roomNo: "301", guestRoom: true }],
  },
]);

const createSourceBooking = () => {
  const start = new Date(Date.now() - (24 * 60 * 60 * 1000));
  const checkout = new Date(Date.now() + (48 * 60 * 60 * 1000));
  const startParts = indiaDateTimeParts(start);
  const checkoutParts = indiaDateTimeParts(checkout);

  return Booking.create({
    guest: "Transfer Guest",
    email: "guest@example.com",
    contact: "9999999999",
    hostel: "Hostel A",
    roomNo: "101",
    from: new Date(`${startParts.date}T00:00:00+05:30`),
    to: new Date(`${checkoutParts.date}T00:00:00+05:30`),
    checkInTime: "00:00",
    checkOutTime: "23:59",
    status: "checked_in",
    reportedStatus: "reported",
    reportedAt: start,
    reportedBy: new mongoose.Types.ObjectId(),
    actualCheckInDate: new Date(`${startParts.date}T00:00:00+05:30`),
    actualCheckInTime: "10:05",
    idVerified: true,
    totalAmount: 8000,
    paidAmount: 5000,
    balanceAmount: 3000,
    paymentStatus: "PARTIALLY_PAID",
    paymentResponsibility: "GUEST",
    paymentMode: "UPI",
    transactionId: "TX-123",
    discount: 250,
    billId: "BILL-123",
    enquiryId: new mongoose.Types.ObjectId(),
  });
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await mongoose.connection.dropDatabase();
  await createHostels();
});

test("transfers the same financial booking, archives source reporting, and requires Report In again", async () => {
  const booking = await createSourceBooking();
  const paymentBefore = {
    totalAmount: booking.totalAmount,
    paidAmount: booking.paidAmount,
    balanceAmount: booking.balanceAmount,
    paymentStatus: booking.paymentStatus,
    paymentResponsibility: booking.paymentResponsibility,
    paymentMode: booking.paymentMode,
    transactionId: booking.transactionId,
    discount: booking.discount,
    billId: booking.billId,
    enquiryId: String(booking.enquiryId),
  };
  const firstTransfer = relativeTransferParts(20);

  const firstResponse = makeResponse();
  await transferBooking(
    makeRequest(booking._id, {
      toHostel: "Hostel B",
      toRoomNo: "201",
      transferDate: firstTransfer.date,
      transferTime: firstTransfer.time,
      remarks: "Operational transfer",
    }),
    firstResponse
  );

  expect(firstResponse.statusCode).toBe(200);
  const transferred = await Booking.findById(booking._id);
  expect(await Booking.countDocuments({ email: booking.email })).toBe(1);
  expect(transferred.hostel).toBe("Hostel B");
  expect(transferred.roomNo).toBe("201");
  expect(transferred.status).toBe("booked");
  expect(transferred.reportedStatus).toBe("pending");
  expect(transferred.reportedAt).toBeNull();
  expect(transferred.reportedBy).toBeNull();
  expect(transferred.actualCheckInDate).toBeNull();
  expect(transferred.actualCheckInTime).toBeNull();
  expect(transferred.idVerified).toBe(false);
  expect(transferred.caretakerEmail).toBe("caretaker-b@example.com");
  expect(transferred.wardenEmail).toBe("warden-b@example.com");
  expect(transferred.transferHistory).toHaveLength(1);
  expect(transferred.transferHistory[0]).toMatchObject({
    fromHostel: "Hostel A",
    fromRoomNo: "101",
    toHostel: "Hostel B",
    toRoomNo: "201",
    sourceStatus: "checked_in",
    sourceReportedStatus: "reported",
    sourceActualCheckInTime: "10:05",
    sourceIdVerified: true,
    remarks: "Operational transfer",
  });
  expect(transferred.transferHistory[0].sourceReportedAt).not.toBeNull();
  expect(transferred.transferHistory[0].sourceReportedBy).not.toBeNull();
  expect({
    totalAmount: transferred.totalAmount,
    paidAmount: transferred.paidAmount,
    balanceAmount: transferred.balanceAmount,
    paymentStatus: transferred.paymentStatus,
    paymentResponsibility: transferred.paymentResponsibility,
    paymentMode: transferred.paymentMode,
    transactionId: transferred.transactionId,
    discount: transferred.discount,
    billId: transferred.billId,
    enquiryId: String(transferred.enquiryId),
  }).toEqual(paymentBefore);

  const secondTransfer = relativeTransferParts(10);
  const secondResponse = makeResponse();
  await transferBooking(
    makeRequest(booking._id, {
      toHostel: "Hostel C",
      toRoomNo: "301",
      transferDate: secondTransfer.date,
      transferTime: secondTransfer.time,
    }),
    secondResponse
  );

  expect(secondResponse.statusCode).toBe(200);
  const transferredAgain = await Booking.findById(booking._id);
  expect(transferredAgain.transferHistory).toHaveLength(2);
  expect(transferredAgain.transferHistory[1]).toMatchObject({
    fromHostel: "Hostel B",
    fromRoomNo: "201",
    toHostel: "Hostel C",
    toRoomNo: "301",
    sourceStatus: "booked",
    sourceReportedStatus: "pending",
  });
  expect(transferredAgain.transferHistory[1].segmentFrom.toISOString()).toBe(
    transferredAgain.transferHistory[0].segmentTo.toISOString()
  );
});

test("rejects a destination conflict and leaves the source booking unchanged", async () => {
  const source = await createSourceBooking();
  const existingStart = indiaDateTimeParts(new Date(Date.now() - (30 * 60 * 1000)));
  const existingEnd = indiaDateTimeParts(new Date(Date.now() + (24 * 60 * 60 * 1000)));
  await Booking.create({
    guest: "Existing Guest",
    email: "existing@example.com",
    contact: "8888888888",
    hostel: "Hostel B",
    roomNo: "201",
    from: new Date(`${existingStart.date}T00:00:00+05:30`),
    to: new Date(`${existingEnd.date}T00:00:00+05:30`),
    checkInTime: existingStart.time,
    checkOutTime: "23:59",
    status: "booked",
  });

  const transfer = relativeTransferParts(20);
  const response = makeResponse();
  await transferBooking(
    makeRequest(source._id, {
      toHostel: "Hostel B",
      toRoomNo: "201",
      transferDate: transfer.date,
      transferTime: transfer.time,
    }),
    response
  );

  expect(response.statusCode).toBe(409);
  const unchanged = await Booking.findById(source._id);
  expect(unchanged.hostel).toBe("Hostel A");
  expect(unchanged.roomNo).toBe("101");
  expect(unchanged.status).toBe("checked_in");
  expect(unchanged.reportedStatus).toBe("reported");
  expect(unchanged.transferHistory).toHaveLength(0);
});

test("rejects same-room, future, unauthorized-source, and blocked-room transfers", async () => {
  const source = await createSourceBooking();
  const validTransfer = relativeTransferParts(10);
  const futureTransfer = indiaDateTimeParts(new Date(Date.now() + (10 * 60 * 1000)));

  const sameRoomResponse = makeResponse();
  await transferBooking(
    makeRequest(source._id, {
      toHostel: "Hostel A",
      toRoomNo: "101",
      transferDate: validTransfer.date,
      transferTime: validTransfer.time,
    }),
    sameRoomResponse
  );
  expect(sameRoomResponse.statusCode).toBe(400);

  const futureResponse = makeResponse();
  await transferBooking(
    makeRequest(source._id, {
      toHostel: "Hostel B",
      toRoomNo: "201",
      transferDate: futureTransfer.date,
      transferTime: futureTransfer.time,
    }),
    futureResponse
  );
  expect(futureResponse.statusCode).toBe(400);

  const unauthorizedResponse = makeResponse();
  await transferBooking(
    makeRequest(
      source._id,
      {
        toHostel: "Hostel B",
        toRoomNo: "201",
        transferDate: validTransfer.date,
        transferTime: validTransfer.time,
      },
      { role: "caretaker", assignedHostel: "Hostel B" }
    ),
    unauthorizedResponse
  );
  expect(unauthorizedResponse.statusCode).toBe(403);

  const destinationHostel = await Hostel.findOne({ name: "Hostel B" });
  destinationHostel.rooms[0].isBlocked = true;
  destinationHostel.rooms[0].roomState = "maintenance_blocked";
  await destinationHostel.save();

  const blockedResponse = makeResponse();
  await transferBooking(
    makeRequest(source._id, {
      toHostel: "Hostel B",
      toRoomNo: "201",
      transferDate: validTransfer.date,
      transferTime: validTransfer.time,
    }),
    blockedResponse
  );
  expect(blockedResponse.statusCode).toBe(409);

  const unchanged = await Booking.findById(source._id);
  expect(unchanged.hostel).toBe("Hostel A");
  expect(unchanged.transferHistory).toHaveLength(0);
});
