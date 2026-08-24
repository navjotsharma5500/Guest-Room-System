import request from "supertest";
import app from "../index.js";
import VenueConfig from "../models/VenueConfig.js";
import User from "../models/User.js";
import * as db from "./db-handler.js";

let adminToken;

beforeAll(async () => {
  await db.connect();

  await User.create({
    name: "Venue Admin",
    email: "venue-admin@test.com",
    password: "password123",
    role: "admin",
  });

  const loginRes = await request(app).post("/api/auth/login").send({
    email: "venue-admin@test.com",
    password: "password123",
  });
  adminToken = loginRes.body.token;
});

afterAll(async () => {
  await db.closeDatabase();
});

beforeEach(async () => {
  await VenueConfig.deleteMany({});
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
              { id: "room-01", name: "Room 01", enabled: true },
              { id: "room-02", name: "Room 02", enabled: true },
              { id: "room-09", name: "Room 09", enabled: true },
              { id: "room-10", name: "Room 10", enabled: true },
            ],
          },
        ],
      },
      {
        id: "auditoriums",
        label: "Auditorium / Halls",
        enabled: true,
        sections: [
          {
            id: "auditorium-list",
            label: "Auditoriums",
            enabled: true,
            rooms: [{ id: "main-auditorium", name: "Main Auditorium", enabled: true }],
          },
        ],
      },
    ],
  });

const patch = (path, body) =>
  request(app)
    .patch(`/api/venue-config${path}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send(body);

describe("Venue Config — rename Main Tab / Room (id, order, status preserved)", () => {
  it("renames a Main Tab label while preserving id, enabled, and section order", async () => {
    await seedConfig();

    const res = await patch("/tab", { mainTabId: "rooms", label: "Lecture Rooms" });

    expect(res.status).toBe(200);
    const tab = res.body.mainTabs.find((t) => t.id === "rooms");
    expect(tab.label).toBe("Lecture Rooms");
    expect(tab.id).toBe("rooms");
    expect(tab.enabled).toBe(true);
    expect(tab.sections[0].rooms.map((r) => r.id)).toEqual([
      "room-01",
      "room-02",
      "room-09",
      "room-10",
    ]);

    const persisted = await VenueConfig.findOne({ key: "global" }).lean();
    const persistedTab = persisted.mainTabs.find((t) => t.id === "rooms");
    expect(persistedTab.label).toBe("Lecture Rooms");
  });

  it("rejects a rename with no mainTabId or empty label", async () => {
    await seedConfig();
    const res = await patch("/tab", { mainTabId: "rooms", label: "   " });
    expect(res.status).toBe(400);
  });

  it("renames a Room while preserving id, enabled status, and its position in the array", async () => {
    await seedConfig();

    const res = await patch("/room", { roomId: "room-09", sectionId: "lecture-theatre", name: "Room 009" });

    expect(res.status).toBe(200);
    const rooms = res.body.mainTabs.find((t) => t.id === "rooms").sections[0].rooms;
    expect(rooms.map((r) => r.id)).toEqual(["room-01", "room-02", "room-09", "room-10"]);
    expect(rooms.find((r) => r.id === "room-09").name).toBe("Room 009");
    expect(rooms.find((r) => r.id === "room-09").enabled).toBe(true);
  });

  it("rejects renaming a room when the given sectionId does not actually own it", async () => {
    await seedConfig();
    // room-09 only exists under lecture-theatre — looking it up scoped to
    // auditorium-list must fail rather than falling back to a global search.
    const res = await patch("/room", {
      roomId: "room-09",
      sectionId: "auditorium-list",
      name: "Wrong Section",
    });
    expect(res.status).toBe(404);

    const persisted = await VenueConfig.findOne({ key: "global" }).lean();
    const room = persisted.mainTabs
      .find((t) => t.id === "rooms").sections[0].rooms.find((r) => r.id === "room-09");
    expect(room.name).toBe("Room 09");
  });

  it("rejects a rename with no sectionId at all", async () => {
    await seedConfig();
    const res = await patch("/room", { roomId: "room-09", name: "Room 009" });
    expect(res.status).toBe(400);
  });
});

describe("Venue Config — room ids are not globally unique, mutations must be section-scoped", () => {
  const seedDuplicateRoomIdConfig = async () =>
    VenueConfig.create({
      key: "global",
      mainTabs: [
        {
          id: "tab-a",
          label: "Tab A",
          enabled: true,
          sections: [
            {
              id: "section-a",
              label: "Section A",
              enabled: true,
              rooms: [{ id: "room-101", name: "Section A Room 101", enabled: true }],
            },
          ],
        },
        {
          id: "tab-b",
          label: "Tab B",
          enabled: true,
          sections: [
            {
              id: "section-b",
              label: "Section B",
              enabled: true,
              rooms: [{ id: "room-101", name: "Section B Room 101", enabled: true }],
            },
          ],
        },
      ],
    });

  it("disabling Section B's room-101 leaves Section A's room-101 completely untouched", async () => {
    await seedDuplicateRoomIdConfig();

    const res = await patch("/toggle", { roomId: "room-101", sectionId: "section-b", enabled: false });
    expect(res.status).toBe(200);

    const sectionARoom = res.body.mainTabs.find((t) => t.id === "tab-a").sections[0].rooms[0];
    const sectionBRoom = res.body.mainTabs.find((t) => t.id === "tab-b").sections[0].rooms[0];

    expect(sectionBRoom.enabled).toBe(false);
    expect(sectionBRoom.name).toBe("Section B Room 101");
    expect(sectionARoom.enabled).toBe(true);
    expect(sectionARoom.name).toBe("Section A Room 101");

    const persisted = await VenueConfig.findOne({ key: "global" }).lean();
    expect(persisted.mainTabs.find((t) => t.id === "tab-a").sections[0].rooms[0].enabled).toBe(true);
    expect(persisted.mainTabs.find((t) => t.id === "tab-b").sections[0].rooms[0].enabled).toBe(false);
  });

  it("rejects a room toggle with roomId but no sectionId", async () => {
    await seedDuplicateRoomIdConfig();
    const res = await patch("/toggle", { roomId: "room-101", enabled: false });
    expect(res.status).toBe(400);

    const persisted = await VenueConfig.findOne({ key: "global" }).lean();
    expect(persisted.mainTabs.find((t) => t.id === "tab-a").sections[0].rooms[0].enabled).toBe(true);
    expect(persisted.mainTabs.find((t) => t.id === "tab-b").sections[0].rooms[0].enabled).toBe(true);
  });

  it("renaming Section A's room-101 leaves Section B's room-101 untouched", async () => {
    await seedDuplicateRoomIdConfig();

    const res = await patch("/room", { roomId: "room-101", sectionId: "section-a", name: "Renamed A" });
    expect(res.status).toBe(200);

    const sectionARoom = res.body.mainTabs.find((t) => t.id === "tab-a").sections[0].rooms[0];
    const sectionBRoom = res.body.mainTabs.find((t) => t.id === "tab-b").sections[0].rooms[0];
    expect(sectionARoom.name).toBe("Renamed A");
    expect(sectionBRoom.name).toBe("Section B Room 101");
  });
});

describe("Venue Config — persisted manual Room order", () => {
  it("persists a manual reorder and returns it on a fresh GET (survives reload)", async () => {
    await seedConfig();

    const newOrder = ["room-02", "room-10", "room-01", "room-09"];
    const res = await patch("/room-order", { sectionId: "lecture-theatre", roomIds: newOrder });

    expect(res.status).toBe(200);
    const rooms = res.body.mainTabs.find((t) => t.id === "rooms").sections[0].rooms;
    expect(rooms.map((r) => r.id)).toEqual(newOrder);
    // Names/enabled state travel with their room, not the position.
    expect(rooms.map((r) => r.name)).toEqual(["Room 02", "Room 10", "Room 01", "Room 09"]);

    const getRes = await request(app).get("/api/venue-config");
    const reloadedRooms = getRes.body.mainTabs.find((t) => t.id === "rooms").sections[0].rooms;
    expect(reloadedRooms.map((r) => r.id)).toEqual(newOrder);
  });

  it("does not numeric-sort names — an intentionally non-numeric admin order is preserved as-is", async () => {
    await seedConfig();
    const deliberateOrder = ["room-10", "room-09", "room-02", "room-01"];
    const res = await patch("/room-order", { sectionId: "lecture-theatre", roomIds: deliberateOrder });
    expect(res.status).toBe(200);
    const rooms = res.body.mainTabs.find((t) => t.id === "rooms").sections[0].rooms;
    expect(rooms.map((r) => r.id)).toEqual(deliberateOrder);
  });

  it("rejects a reorder payload missing one of the section's rooms", async () => {
    await seedConfig();
    const res = await patch("/room-order", {
      sectionId: "lecture-theatre",
      roomIds: ["room-01", "room-02", "room-09"], // room-10 missing
    });
    expect(res.status).toBe(400);

    const persisted = await VenueConfig.findOne({ key: "global" }).lean();
    const rooms = persisted.mainTabs.find((t) => t.id === "rooms").sections[0].rooms;
    expect(rooms.map((r) => r.id)).toEqual(["room-01", "room-02", "room-09", "room-10"]);
  });

  it("rejects a reorder payload with a duplicate room id", async () => {
    await seedConfig();
    const res = await patch("/room-order", {
      sectionId: "lecture-theatre",
      roomIds: ["room-01", "room-01", "room-09", "room-10"],
    });
    expect(res.status).toBe(400);
  });

  it("rejects a reorder payload containing a room id from a different section", async () => {
    await seedConfig();
    const res = await patch("/room-order", {
      sectionId: "lecture-theatre",
      roomIds: ["room-01", "room-02", "room-09", "main-auditorium"],
    });
    expect(res.status).toBe(400);

    const persisted = await VenueConfig.findOne({ key: "global" }).lean();
    const auditoriumRooms = persisted.mainTabs.find((t) => t.id === "auditoriums").sections[0].rooms;
    expect(auditoriumRooms.map((r) => r.id)).toEqual(["main-auditorium"]);
  });

  it("cannot be used to reorder a different Main Tab's rooms via a mismatched sectionId", async () => {
    await seedConfig();
    // auditorium-list only has one room; submitting lecture-theatre's 4 ids against it must fail.
    const res = await patch("/room-order", {
      sectionId: "auditorium-list",
      roomIds: ["room-01", "room-02", "room-09", "room-10"],
    });
    expect(res.status).toBe(400);
  });

  it("survives multiple sequential reorders without losing or duplicating rooms", async () => {
    await seedConfig();

    await patch("/room-order", { sectionId: "lecture-theatre", roomIds: ["room-02", "room-01", "room-09", "room-10"] });
    await patch("/room-order", { sectionId: "lecture-theatre", roomIds: ["room-10", "room-02", "room-01", "room-09"] });
    const finalRes = await patch("/room-order", {
      sectionId: "lecture-theatre",
      roomIds: ["room-01", "room-09", "room-10", "room-02"],
    });

    expect(finalRes.status).toBe(200);
    const rooms = finalRes.body.mainTabs.find((t) => t.id === "rooms").sections[0].rooms;
    expect(rooms.map((r) => r.id).sort()).toEqual(["room-01", "room-02", "room-09", "room-10"]);
    expect(rooms.map((r) => r.id)).toEqual(["room-01", "room-09", "room-10", "room-02"]);
  });

  it("appends a newly added room to the end of the section's current order", async () => {
    await seedConfig();
    await patch("/room-order", { sectionId: "lecture-theatre", roomIds: ["room-10", "room-09", "room-02", "room-01"] });

    const addRes = await request(app)
      .post("/api/venue-config/room")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ sectionId: "lecture-theatre", name: "Room 11" });

    expect(addRes.status).toBe(200);
    const rooms = addRes.body.mainTabs.find((t) => t.id === "rooms").sections[0].rooms;
    expect(rooms.map((r) => r.name)).toEqual(["Room 10", "Room 09", "Room 02", "Room 01", "Room 11"]);
  });
});
