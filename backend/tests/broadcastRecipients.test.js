import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

process.env.NODE_ENV = "test";

const { resolveBroadcastRecipients } = await import("../services/broadcastScheduler.js");
const { normalizeEmails } = await import("../controllers/broadcastController.js");
const Hostel = (await import("../models/Hostel.js")).default;
const User = (await import("../models/User.js")).default;
const Booking = (await import("../models/Booking.js")).default;

let mongoServer;

const emailsOf = (recipients) => recipients.map((r) => r.email).sort();

const makeBooking = (overrides = {}) => ({
  guest: "Guest",
  email: "guest@example.com",
  contact: "9999999999",
  hostel: "Guest House A",
  roomNo: "101",
  from: new Date("2026-01-01"),
  to: new Date("2026-01-05"),
  status: "checked_in",
  paymentType: "Paid",
  paymentResponsibility: "GUEST",
  balanceAmount: 0,
  ...overrides,
});

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  await Hostel.create([
    {
      name: "Guest House A",
      code: "GHA",
      caretakerEmail: "caretaker-a@thapar.edu",
      wardenEmail: "warden-a@thapar.edu",
    },
    {
      name: "Guest House B",
      code: "GHB",
      caretakerEmail: "caretaker-b@thapar.edu",
      wardenEmail: "warden-b@thapar.edu",
    },
  ]);

  await User.create([
    {
      name: "Caretaker A",
      email: "caretaker-a@thapar.edu", // same as Hostel.caretakerEmail -> must dedupe
      password: "x",
      role: "caretaker",
      assignedHostel: "Guest House A",
    },
    {
      name: "Extra Caretaker A",
      email: "extra-caretaker-a@thapar.edu",
      password: "x",
      role: "caretaker",
      assignedHostel: "Guest House A",
    },
    {
      name: "Caretaker B",
      email: "caretaker-b2@thapar.edu",
      password: "x",
      role: "caretaker",
      assignedHostel: "Guest House B",
    },
    {
      name: "Warden A",
      email: "warden-a2@thapar.edu",
      password: "x",
      role: "Warden",
      hostel: "Guest House A",
    },
    {
      name: "Inactive Caretaker A",
      email: "inactive-caretaker-a@thapar.edu",
      password: "x",
      role: "caretaker",
      assignedHostel: "Guest House A",
      isActive: false,
    },
  ]);

  await Booking.create([
    // Active guest of Hostel A (booked, not yet checked in) -> counts as active
    makeBooking({ email: "active-booked@example.com", status: "booked", hostel: "Guest House A" }),
    // Active guest of Hostel A (checked in)
    makeBooking({ email: "active-checkedin@example.com", status: "checked_in", hostel: "Guest House A" }),
    // Checked-out guest -> NOT active
    makeBooking({ email: "checkedout@example.com", status: "checked_out", hostel: "Guest House A" }),
    // Cancelled guest -> NOT active
    makeBooking({ email: "cancelled@example.com", status: "cancelled", hostel: "Guest House A" }),

    // Canonical defaulter: checked_out, balance > 0, Paid, GUEST responsibility
    makeBooking({
      email: "defaulter@example.com",
      status: "checked_out",
      balanceAmount: 500,
      totalAmount: 500,
      paymentType: "Paid",
      paymentResponsibility: "GUEST",
    }),
    // Department-paid with a balance -> must NEVER be a defaulter
    makeBooking({
      email: "department@example.com",
      status: "checked_out",
      balanceAmount: 500,
      totalAmount: 500,
      paymentType: "Paid",
      paymentResponsibility: "DEPARTMENT",
    }),
    // Free booking with a balance -> must NEVER be a defaulter
    makeBooking({
      email: "free@example.com",
      status: "checked_out",
      balanceAmount: 500,
      totalAmount: 500,
      paymentType: "Free",
      paymentResponsibility: "GUEST",
    }),
    // Booked (not yet checked in) with a balance -> must NOT be a defaulter
    makeBooking({
      email: "not-yet-arrived@example.com",
      status: "booked",
      balanceAmount: 500,
      totalAmount: 500,
      paymentType: "Paid",
      paymentResponsibility: "GUEST",
    }),
  ]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

test("specific_hostel resolves only that hostel's caretaker(s) + warden(s), never guests, deduplicated", async () => {
  const recipients = await resolveBroadcastRecipients({
    recipientGroups: ["specific_hostel"],
    specificHostel: "Guest House A",
  });

  expect(emailsOf(recipients)).toEqual(
    ["caretaker-a@thapar.edu", "extra-caretaker-a@thapar.edu", "warden-a2@thapar.edu", "warden-a@thapar.edu"].sort()
  );
  expect(recipients.every((r) => r.role !== "guest")).toBe(true);
  expect(recipients.some((r) => r.email === "inactive-caretaker-a@thapar.edu")).toBe(false);
});

test("specific_hostel is case-insensitively exact-matched, not partial", async () => {
  const recipients = await resolveBroadcastRecipients({
    recipientGroups: ["specific_hostel"],
    specificHostel: "guest house a", // different case, exact name otherwise
  });
  expect(emailsOf(recipients).length).toBeGreaterThan(0);

  const partial = await resolveBroadcastRecipients({
    recipientGroups: ["specific_hostel"],
    specificHostel: "Guest House", // partial/substring — must NOT match
  });
  expect(partial).toEqual([]);
});

test("specific_hostel with an unknown hostel resolves zero recipients (no fallback)", async () => {
  const recipients = await resolveBroadcastRecipients({
    recipientGroups: ["specific_hostel"],
    specificHostel: "Nonexistent Hostel",
  });
  expect(recipients).toEqual([]);
});

test("all_caretakers resolves only active caretakers", async () => {
  const recipients = await resolveBroadcastRecipients({ recipientGroups: ["all_caretakers"] });
  expect(emailsOf(recipients)).toEqual(
    ["caretaker-a@thapar.edu", "extra-caretaker-a@thapar.edu", "caretaker-b2@thapar.edu"].sort()
  );
});

test("all_wardens resolves only wardens", async () => {
  const recipients = await resolveBroadcastRecipients({ recipientGroups: ["all_wardens"] });
  expect(emailsOf(recipients)).toEqual(["warden-a2@thapar.edu"]);
});

test("all_active_guests resolves only booked/checked_in bookings", async () => {
  const recipients = await resolveBroadcastRecipients({ recipientGroups: ["all_active_guests"] });
  const emails = emailsOf(recipients);
  expect(emails).toEqual(
    expect.arrayContaining(["active-booked@example.com", "active-checkedin@example.com"])
  );
  expect(emails).not.toEqual(expect.arrayContaining(["checkedout@example.com", "cancelled@example.com"]));
});

test("all_defaulters matches the canonical defaulter definition (excludes Free/DEPARTMENT/not-yet-arrived)", async () => {
  const recipients = await resolveBroadcastRecipients({ recipientGroups: ["all_defaulters"] });
  expect(emailsOf(recipients)).toEqual(["defaulter@example.com"]);
});

test("normalizeEmails trims, deduplicates case-insensitively, and rejects malformed addresses", () => {
  expect(normalizeEmails(" a@example.com \nA@example.com, b@example.com ; not-an-email"))
    .toEqual(["a@example.com", "b@example.com"]);
  expect(normalizeEmails(["a@example.com", "A@example.com", ""])).toEqual(["a@example.com"]);
});

test("custom recipient group passes already-normalized emails through with a final dedupe", async () => {
  const recipients = await resolveBroadcastRecipients({
    recipientGroups: ["custom"],
    customEmails: normalizeEmails(["a@example.com", "A@example.com", " b@example.com "]),
  });
  expect(emailsOf(recipients)).toEqual(["a@example.com", "b@example.com"]);
});
