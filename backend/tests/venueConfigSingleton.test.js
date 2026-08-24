import request from "supertest";
import app from "../index.js";
import VenueConfig from "../models/VenueConfig.js";
import * as db from "./db-handler.js";

beforeAll(async () => {
  await db.connect();
  await VenueConfig.init();
});

afterEach(async () => {
  await db.clearDatabase();
});

afterAll(async () => {
  await db.closeDatabase();
});

test("adopts the newest legacy config as global without replacing dynamic rooms", async () => {
  const legacyTabs = [{
    id: "dynamic-tab",
    label: "Dynamic Tab",
    enabled: true,
    sections: [{
      id: "dynamic-section",
      label: "Dynamic Section",
      enabled: true,
      rooms: [{ id: "new-room", name: "New Room", enabled: true, previousNames: [] }],
    }],
  }];
  const legacy = await VenueConfig.create({ mainTabs: legacyTabs });

  const response = await request(app).get("/api/venue-config");

  expect(response.status).toBe(200);
  expect(response.body.mainTabs).toEqual(legacyTabs);
  const adopted = await VenueConfig.findById(legacy._id).lean();
  expect(adopted.key).toBe("global");
  expect(adopted.mainTabs[0].sections[0].rooms[0].name).toBe("New Room");
});

test("concurrent first reads create only one global config", async () => {
  const responses = await Promise.all(
    Array.from({ length: 4 }, () => request(app).get("/api/venue-config"))
  );

  expect(responses.every((response) => response.status === 200)).toBe(true);
  expect(await VenueConfig.countDocuments({ key: "global" })).toBe(1);
});
