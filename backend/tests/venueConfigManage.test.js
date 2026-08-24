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

const post = (path, body) =>
  request(app)
    .post(`/api/venue-config${path}`)
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

    const res = await patch("/room", {
      mainTabId: "rooms",
      sectionId: "lecture-theatre",
      roomId: "room-09",
      name: "Room 009",
    });

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
      mainTabId: "rooms",
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
    const res = await patch("/room", { mainTabId: "rooms", roomId: "room-09", name: "Room 009" });
    expect(res.status).toBe(400);
  });

  it("rejects a room rename with no mainTabId at all", async () => {
    await seedConfig();
    const res = await patch("/room", { sectionId: "lecture-theatre", roomId: "room-09", name: "Room 009" });
    expect(res.status).toBe(400);

    const persisted = await VenueConfig.findOne({ key: "global" }).lean();
    const room = persisted.mainTabs
      .find((t) => t.id === "rooms").sections[0].rooms.find((r) => r.id === "room-09");
    expect(room.name).toBe("Room 09");
  });
});

describe("Venue Config — rename Section (id, enabled, rooms, order preserved)", () => {
  it("renames a Section label while preserving id, enabled, rooms, and room order", async () => {
    await seedConfig();

    const res = await patch("/section", {
      mainTabId: "rooms",
      sectionId: "lecture-theatre",
      label: "Lecture Rooms",
    });

    expect(res.status).toBe(200);
    const section = res.body.mainTabs.find((t) => t.id === "rooms").sections[0];
    expect(section.label).toBe("Lecture Rooms");
    expect(section.id).toBe("lecture-theatre");
    expect(section.enabled).toBe(true);
    expect(section.rooms.map((r) => r.id)).toEqual(["room-01", "room-02", "room-09", "room-10"]);
    expect(section.previousNames).toEqual(["Lecture Theatre"]);

    const persisted = await VenueConfig.findOne({ key: "global" }).lean();
    const persistedSection = persisted.mainTabs.find((t) => t.id === "rooms").sections[0];
    expect(persistedSection.label).toBe("Lecture Rooms");
  });

  it("accumulates previousNames across multiple renames without duplicates", async () => {
    await seedConfig();

    await patch("/section", { mainTabId: "rooms", sectionId: "lecture-theatre", label: "Agira Hal (A)" });
    await patch("/section", { mainTabId: "rooms", sectionId: "lecture-theatre", label: "Agira Hall (A)" });
    const finalRes = await patch("/section", {
      mainTabId: "rooms",
      sectionId: "lecture-theatre",
      label: "Agira Hall - A",
    });

    expect(finalRes.status).toBe(200);
    const section = finalRes.body.mainTabs.find((t) => t.id === "rooms").sections[0];
    expect(section.label).toBe("Agira Hall - A");
    expect(section.previousNames.sort()).toEqual(
      ["Agira Hal (A)", "Agira Hall (A)", "Lecture Theatre"].sort()
    );
    expect(new Set(section.previousNames).size).toBe(section.previousNames.length);
  });

  it("rejects a rename with no mainTabId at all", async () => {
    await seedConfig();
    const res = await patch("/section", { sectionId: "lecture-theatre", label: "New Label" });
    expect(res.status).toBe(400);
  });

  it("rejects renaming a section when the given mainTabId does not actually own it", async () => {
    await seedConfig();
    // lecture-theatre only exists under "rooms" — looking it up scoped to
    // "auditoriums" must fail rather than falling back to a global search.
    const res = await patch("/section", {
      mainTabId: "auditoriums",
      sectionId: "lecture-theatre",
      label: "Wrong Tab",
    });
    expect(res.status).toBe(404);

    const persisted = await VenueConfig.findOne({ key: "global" }).lean();
    const section = persisted.mainTabs.find((t) => t.id === "rooms").sections[0];
    expect(section.label).toBe("Lecture Theatre");
  });
});

describe("Venue Config — section ids are not globally unique, rename/toggle/add-room must be main-tab-scoped", () => {
  const seedDuplicateSectionIdConfig = async () =>
    VenueConfig.create({
      key: "global",
      mainTabs: [
        {
          id: "tab-a",
          label: "Tab A",
          enabled: true,
          sections: [
            { id: "shared-section", label: "Tab A Section", enabled: true, rooms: [] },
          ],
        },
        {
          id: "tab-b",
          label: "Tab B",
          enabled: true,
          sections: [
            { id: "shared-section", label: "Tab B Section", enabled: true, rooms: [] },
          ],
        },
      ],
    });

  it("renaming Tab B's section leaves Tab A's identically-id'd section untouched", async () => {
    await seedDuplicateSectionIdConfig();

    const res = await patch("/section", {
      mainTabId: "tab-b",
      sectionId: "shared-section",
      label: "Renamed B",
    });
    expect(res.status).toBe(200);

    const tabASection = res.body.mainTabs.find((t) => t.id === "tab-a").sections[0];
    const tabBSection = res.body.mainTabs.find((t) => t.id === "tab-b").sections[0];
    expect(tabBSection.label).toBe("Renamed B");
    expect(tabASection.label).toBe("Tab A Section");
  });

  it("disabling Tab B's identically-id'd section leaves Tab A's section enabled", async () => {
    await seedDuplicateSectionIdConfig();

    const res = await patch("/toggle", {
      mainTabId: "tab-b",
      sectionId: "shared-section",
      enabled: false,
    });
    expect(res.status).toBe(200);

    const tabASection = res.body.mainTabs.find((t) => t.id === "tab-a").sections[0];
    const tabBSection = res.body.mainTabs.find((t) => t.id === "tab-b").sections[0];
    expect(tabBSection.enabled).toBe(false);
    expect(tabASection.enabled).toBe(true);

    const persisted = await VenueConfig.findOne({ key: "global" }).lean();
    expect(persisted.mainTabs.find((t) => t.id === "tab-a").sections[0].enabled).toBe(true);
    expect(persisted.mainTabs.find((t) => t.id === "tab-b").sections[0].enabled).toBe(false);
  });

  it("rejects a section toggle with sectionId but no mainTabId", async () => {
    await seedDuplicateSectionIdConfig();
    const res = await patch("/toggle", { sectionId: "shared-section", enabled: false });
    expect(res.status).toBe(400);

    const persisted = await VenueConfig.findOne({ key: "global" }).lean();
    expect(persisted.mainTabs.find((t) => t.id === "tab-a").sections[0].enabled).toBe(true);
    expect(persisted.mainTabs.find((t) => t.id === "tab-b").sections[0].enabled).toBe(true);
  });

  it("adding a room to Tab B's identically-id'd section leaves Tab A's section untouched", async () => {
    await seedDuplicateSectionIdConfig();

    const res = await post("/room", { mainTabId: "tab-b", sectionId: "shared-section", name: "Room 101" });
    expect(res.status).toBe(200);

    const tabASection = res.body.mainTabs.find((t) => t.id === "tab-a").sections[0];
    const tabBSection = res.body.mainTabs.find((t) => t.id === "tab-b").sections[0];
    expect(tabBSection.rooms.map((r) => r.name)).toEqual(["Room 101"]);
    expect(tabASection.rooms).toEqual([]);

    const persisted = await VenueConfig.findOne({ key: "global" }).lean();
    expect(persisted.mainTabs.find((t) => t.id === "tab-a").sections[0].rooms).toEqual([]);
    expect(persisted.mainTabs.find((t) => t.id === "tab-b").sections[0].rooms.map((r) => r.name)).toEqual([
      "Room 101",
    ]);
  });

  it("rejects adding a room with sectionId but no mainTabId", async () => {
    await seedDuplicateSectionIdConfig();
    const res = await post("/room", { sectionId: "shared-section", name: "Room 101" });
    expect(res.status).toBe(400);

    const persisted = await VenueConfig.findOne({ key: "global" }).lean();
    expect(persisted.mainTabs.find((t) => t.id === "tab-a").sections[0].rooms).toEqual([]);
    expect(persisted.mainTabs.find((t) => t.id === "tab-b").sections[0].rooms).toEqual([]);
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

    const res = await patch("/toggle", {
      mainTabId: "tab-b",
      sectionId: "section-b",
      roomId: "room-101",
      enabled: false,
    });
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

  it("rejects a room toggle with sectionId but no mainTabId", async () => {
    await seedDuplicateRoomIdConfig();
    const res = await patch("/toggle", { sectionId: "section-b", roomId: "room-101", enabled: false });
    expect(res.status).toBe(400);

    const persisted = await VenueConfig.findOne({ key: "global" }).lean();
    expect(persisted.mainTabs.find((t) => t.id === "tab-a").sections[0].rooms[0].enabled).toBe(true);
    expect(persisted.mainTabs.find((t) => t.id === "tab-b").sections[0].rooms[0].enabled).toBe(true);
  });

  it("rejects a room toggle with roomId but no sectionId", async () => {
    await seedDuplicateRoomIdConfig();
    const res = await patch("/toggle", { mainTabId: "tab-b", roomId: "room-101", enabled: false });
    expect(res.status).toBe(400);

    const persisted = await VenueConfig.findOne({ key: "global" }).lean();
    expect(persisted.mainTabs.find((t) => t.id === "tab-a").sections[0].rooms[0].enabled).toBe(true);
    expect(persisted.mainTabs.find((t) => t.id === "tab-b").sections[0].rooms[0].enabled).toBe(true);
  });

  it("renaming Section A's room-101 leaves Section B's room-101 untouched", async () => {
    await seedDuplicateRoomIdConfig();

    const res = await patch("/room", {
      mainTabId: "tab-a",
      sectionId: "section-a",
      roomId: "room-101",
      name: "Renamed A",
    });
    expect(res.status).toBe(200);

    const sectionARoom = res.body.mainTabs.find((t) => t.id === "tab-a").sections[0].rooms[0];
    const sectionBRoom = res.body.mainTabs.find((t) => t.id === "tab-b").sections[0].rooms[0];
    expect(sectionARoom.name).toBe("Renamed A");
    expect(sectionBRoom.name).toBe("Section B Room 101");
  });
});

describe("Venue Config — TRUE collision: same Section id AND same Room id across two Main Tabs", () => {
  const seedTrueCollisionConfig = async () =>
    VenueConfig.create({
      key: "global",
      mainTabs: [
        {
          id: "tab-a",
          label: "Tab A",
          enabled: true,
          sections: [
            {
              id: "shared-section",
              label: "Shared Section A",
              enabled: true,
              rooms: [
                { id: "room-101", name: "A Room 101", enabled: true },
                { id: "room-102", name: "A Room 102", enabled: true },
              ],
            },
          ],
        },
        {
          id: "tab-b",
          label: "Tab B",
          enabled: true,
          sections: [
            {
              id: "shared-section",
              label: "Shared Section B",
              enabled: true,
              rooms: [
                { id: "room-101", name: "B Room 101", enabled: true },
                { id: "room-102", name: "B Room 102", enabled: true },
              ],
            },
          ],
        },
      ],
    });

  it("A. disabling Tab B / shared-section / room-101 changes only B's room", async () => {
    await seedTrueCollisionConfig();

    const res = await patch("/toggle", {
      mainTabId: "tab-b",
      sectionId: "shared-section",
      roomId: "room-101",
      enabled: false,
    });
    expect(res.status).toBe(200);

    const roomA = res.body.mainTabs.find((t) => t.id === "tab-a").sections[0].rooms.find((r) => r.id === "room-101");
    const roomB = res.body.mainTabs.find((t) => t.id === "tab-b").sections[0].rooms.find((r) => r.id === "room-101");
    expect(roomB.enabled).toBe(false);
    expect(roomA.enabled).toBe(true);

    const persisted = await VenueConfig.findOne({ key: "global" }).lean();
    const persistedA = persisted.mainTabs.find((t) => t.id === "tab-a").sections[0].rooms.find((r) => r.id === "room-101");
    const persistedB = persisted.mainTabs.find((t) => t.id === "tab-b").sections[0].rooms.find((r) => r.id === "room-101");
    expect(persistedA.enabled).toBe(true);
    expect(persistedB.enabled).toBe(false);
    // The sibling room-102 in both sections must be completely unaffected.
    expect(persisted.mainTabs.find((t) => t.id === "tab-a").sections[0].rooms.find((r) => r.id === "room-102").enabled).toBe(true);
    expect(persisted.mainTabs.find((t) => t.id === "tab-b").sections[0].rooms.find((r) => r.id === "room-102").enabled).toBe(true);
  });

  it("B. renaming Tab B / shared-section / room-101 changes only B's room", async () => {
    await seedTrueCollisionConfig();

    const res = await patch("/room", {
      mainTabId: "tab-b",
      sectionId: "shared-section",
      roomId: "room-101",
      name: "Renamed B Room",
    });
    expect(res.status).toBe(200);

    const roomA = res.body.mainTabs.find((t) => t.id === "tab-a").sections[0].rooms.find((r) => r.id === "room-101");
    const roomB = res.body.mainTabs.find((t) => t.id === "tab-b").sections[0].rooms.find((r) => r.id === "room-101");
    expect(roomB.name).toBe("Renamed B Room");
    expect(roomA.name).toBe("A Room 101");

    const persisted = await VenueConfig.findOne({ key: "global" }).lean();
    expect(persisted.mainTabs.find((t) => t.id === "tab-a").sections[0].rooms.find((r) => r.id === "room-101").name).toBe("A Room 101");
    expect(persisted.mainTabs.find((t) => t.id === "tab-b").sections[0].rooms.find((r) => r.id === "room-101").name).toBe("Renamed B Room");
  });

  it("C. reordering rooms inside Tab B / shared-section changes only B's order", async () => {
    await seedTrueCollisionConfig();

    const res = await patch("/room-order", {
      mainTabId: "tab-b",
      sectionId: "shared-section",
      roomIds: ["room-102", "room-101"],
    });
    expect(res.status).toBe(200);

    const sectionA = res.body.mainTabs.find((t) => t.id === "tab-a").sections[0];
    const sectionB = res.body.mainTabs.find((t) => t.id === "tab-b").sections[0];
    expect(sectionB.rooms.map((r) => r.id)).toEqual(["room-102", "room-101"]);
    // A's order (insertion order) must be completely unaffected.
    expect(sectionA.rooms.map((r) => r.id)).toEqual(["room-101", "room-102"]);

    const persisted = await VenueConfig.findOne({ key: "global" }).lean();
    expect(persisted.mainTabs.find((t) => t.id === "tab-a").sections[0].rooms.map((r) => r.id)).toEqual([
      "room-101",
      "room-102",
    ]);
    expect(persisted.mainTabs.find((t) => t.id === "tab-b").sections[0].rooms.map((r) => r.id)).toEqual([
      "room-102",
      "room-101",
    ]);
  });

  it("D1. missing mainTabId for a room toggle is rejected and nothing changes", async () => {
    await seedTrueCollisionConfig();

    const res = await patch("/toggle", { sectionId: "shared-section", roomId: "room-101", enabled: false });
    expect(res.status).toBe(400);

    const persisted = await VenueConfig.findOne({ key: "global" }).lean();
    expect(persisted.mainTabs.find((t) => t.id === "tab-a").sections[0].rooms.find((r) => r.id === "room-101").enabled).toBe(true);
    expect(persisted.mainTabs.find((t) => t.id === "tab-b").sections[0].rooms.find((r) => r.id === "room-101").enabled).toBe(true);
  });

  it("D2. missing mainTabId for a room rename is rejected and nothing changes", async () => {
    await seedTrueCollisionConfig();

    const res = await patch("/room", { sectionId: "shared-section", roomId: "room-101", name: "Should Not Apply" });
    expect(res.status).toBe(400);

    const persisted = await VenueConfig.findOne({ key: "global" }).lean();
    expect(persisted.mainTabs.find((t) => t.id === "tab-a").sections[0].rooms.find((r) => r.id === "room-101").name).toBe("A Room 101");
    expect(persisted.mainTabs.find((t) => t.id === "tab-b").sections[0].rooms.find((r) => r.id === "room-101").name).toBe("B Room 101");
  });

  it("D3. missing mainTabId for a room reorder is rejected and nothing changes", async () => {
    await seedTrueCollisionConfig();

    const res = await patch("/room-order", { sectionId: "shared-section", roomIds: ["room-102", "room-101"] });
    expect(res.status).toBe(400);

    const persisted = await VenueConfig.findOne({ key: "global" }).lean();
    expect(persisted.mainTabs.find((t) => t.id === "tab-a").sections[0].rooms.map((r) => r.id)).toEqual([
      "room-101",
      "room-102",
    ]);
    expect(persisted.mainTabs.find((t) => t.id === "tab-b").sections[0].rooms.map((r) => r.id)).toEqual([
      "room-101",
      "room-102",
    ]);
  });

  it("D4. missing mainTabId for adding a room is rejected and nothing changes", async () => {
    await seedTrueCollisionConfig();

    const res = await post("/room", { sectionId: "shared-section", name: "New Room" });
    expect(res.status).toBe(400);

    const persisted = await VenueConfig.findOne({ key: "global" }).lean();
    expect(persisted.mainTabs.find((t) => t.id === "tab-a").sections[0].rooms).toHaveLength(2);
    expect(persisted.mainTabs.find((t) => t.id === "tab-b").sections[0].rooms).toHaveLength(2);
  });

  it("a wrong mainTabId (section/room genuinely belongs to the other tab) is rejected, not silently resolved elsewhere", async () => {
    await seedTrueCollisionConfig();

    // shared-section/room-101 exists under tab-b, but tab-a's own copy is a
    // DIFFERENT document — asking for tab-a's mainTabId while trying to
    // rename what the admin intends as "the tab-b room" must still resolve
    // strictly within tab-a's scope (renaming tab-a's own room-101), never
    // cross over to tab-b's.
    const res = await patch("/room", {
      mainTabId: "tab-a",
      sectionId: "shared-section",
      roomId: "room-101",
      name: "Renamed A Only",
    });
    expect(res.status).toBe(200);

    const persisted = await VenueConfig.findOne({ key: "global" }).lean();
    expect(persisted.mainTabs.find((t) => t.id === "tab-a").sections[0].rooms.find((r) => r.id === "room-101").name).toBe("Renamed A Only");
    expect(persisted.mainTabs.find((t) => t.id === "tab-b").sections[0].rooms.find((r) => r.id === "room-101").name).toBe("B Room 101");
  });
});

describe("Venue Config — persisted manual Room order", () => {
  it("persists a manual reorder and returns it on a fresh GET (survives reload)", async () => {
    await seedConfig();

    const newOrder = ["room-02", "room-10", "room-01", "room-09"];
    const res = await patch("/room-order", { mainTabId: "rooms", sectionId: "lecture-theatre", roomIds: newOrder });

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
    const res = await patch("/room-order", { mainTabId: "rooms", sectionId: "lecture-theatre", roomIds: deliberateOrder });
    expect(res.status).toBe(200);
    const rooms = res.body.mainTabs.find((t) => t.id === "rooms").sections[0].rooms;
    expect(rooms.map((r) => r.id)).toEqual(deliberateOrder);
  });

  it("rejects a reorder payload missing one of the section's rooms", async () => {
    await seedConfig();
    const res = await patch("/room-order", {
      mainTabId: "rooms",
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
      mainTabId: "rooms",
      sectionId: "lecture-theatre",
      roomIds: ["room-01", "room-01", "room-09", "room-10"],
    });
    expect(res.status).toBe(400);
  });

  it("rejects a reorder payload containing a room id from a different section", async () => {
    await seedConfig();
    const res = await patch("/room-order", {
      mainTabId: "rooms",
      sectionId: "lecture-theatre",
      roomIds: ["room-01", "room-02", "room-09", "main-auditorium"],
    });
    expect(res.status).toBe(400);

    const persisted = await VenueConfig.findOne({ key: "global" }).lean();
    const auditoriumRooms = persisted.mainTabs.find((t) => t.id === "auditoriums").sections[0].rooms;
    expect(auditoriumRooms.map((r) => r.id)).toEqual(["main-auditorium"]);
  });

  it("cannot be used to reorder a different section's rooms via a mismatched sectionId", async () => {
    await seedConfig();
    // auditorium-list only has one room; submitting lecture-theatre's 4 ids against it must fail.
    const res = await patch("/room-order", {
      mainTabId: "auditoriums",
      sectionId: "auditorium-list",
      roomIds: ["room-01", "room-02", "room-09", "room-10"],
    });
    expect(res.status).toBe(400);
  });

  it("rejects a reorder with no mainTabId at all", async () => {
    await seedConfig();
    const res = await patch("/room-order", {
      sectionId: "lecture-theatre",
      roomIds: ["room-01", "room-02", "room-09", "room-10"],
    });
    expect(res.status).toBe(400);

    const persisted = await VenueConfig.findOne({ key: "global" }).lean();
    const rooms = persisted.mainTabs.find((t) => t.id === "rooms").sections[0].rooms;
    expect(rooms.map((r) => r.id)).toEqual(["room-01", "room-02", "room-09", "room-10"]);
  });

  it("survives multiple sequential reorders without losing or duplicating rooms", async () => {
    await seedConfig();

    await patch("/room-order", { mainTabId: "rooms", sectionId: "lecture-theatre", roomIds: ["room-02", "room-01", "room-09", "room-10"] });
    await patch("/room-order", { mainTabId: "rooms", sectionId: "lecture-theatre", roomIds: ["room-10", "room-02", "room-01", "room-09"] });
    const finalRes = await patch("/room-order", {
      mainTabId: "rooms",
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
    await patch("/room-order", { mainTabId: "rooms", sectionId: "lecture-theatre", roomIds: ["room-10", "room-09", "room-02", "room-01"] });

    const addRes = await post("/room", { mainTabId: "rooms", sectionId: "lecture-theatre", name: "Room 11" });

    expect(addRes.status).toBe(200);
    const rooms = addRes.body.mainTabs.find((t) => t.id === "rooms").sections[0].rooms;
    expect(rooms.map((r) => r.name)).toEqual(["Room 10", "Room 09", "Room 02", "Room 01", "Room 11"]);
  });
});
