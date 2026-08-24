import {
  getEnabledVenueDataTemplate,
  getEnabledVenueFormOptions,
  getEnabledVenueRoomsConfig,
  getEnabledVenueSectionLabelById,
} from "./venueRoomsConfig";

const buildConfig = (overrides = {}) => [
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
        id: "disabled-section",
        label: "Disabled Section",
        enabled: false,
        rooms: [{ id: "disabled-room", name: "Disabled Room", enabled: true }],
      },
      {
        id: "empty-section",
        label: "Empty Section",
        enabled: true,
        rooms: [],
      },
      {
        id: "empty-disabled-section",
        label: "Empty Disabled Section",
        enabled: false,
        rooms: [],
      },
    ],
    ...overrides,
  },
];

describe("venueRoomsConfig — disabled Section visibility filtering", () => {
  test("getEnabledVenueRoomsConfig excludes a disabled section and its rooms entirely", () => {
    const enabled = getEnabledVenueRoomsConfig(buildConfig());
    const sectionIds = enabled[0].sections.map((s) => s.id);
    expect(sectionIds).not.toContain("disabled-section");
    expect(sectionIds).not.toContain("empty-disabled-section");
    expect(sectionIds).toContain("agira-hall");
  });

  test("getEnabledVenueSectionLabelById resolves the label of an enabled section", () => {
    expect(getEnabledVenueSectionLabelById("agira-hall", buildConfig())).toBe("Agira Hall (A)");
  });

  test("getEnabledVenueSectionLabelById returns null for a disabled section (not selectable/navigable)", () => {
    expect(getEnabledVenueSectionLabelById("disabled-section", buildConfig())).toBeNull();
  });

  test("getEnabledVenueSectionLabelById returns null when the section's parent Main Tab is disabled", () => {
    const config = buildConfig({ enabled: false });
    expect(getEnabledVenueSectionLabelById("agira-hall", config)).toBeNull();
  });

  test("getEnabledVenueFormOptions (booking form dropdown) never includes a disabled section", () => {
    const options = getEnabledVenueFormOptions(buildConfig());
    const halls = options.map((o) => o.hall);
    expect(halls).not.toContain("Disabled Section");
    expect(halls).toContain("Agira Hall (A)");
  });
});

describe("venueRoomsConfig — no Section-with-zero-rooms-becomes-a-room fallback", () => {
  test("an enabled section with zero rooms produces no entry in the venue data template", () => {
    const template = getEnabledVenueDataTemplate(buildConfig());
    expect(template["Empty Section"]).toBeUndefined();
    expect(Object.keys(template)).not.toContain("Empty Section");
  });

  test("a disabled section with zero rooms also produces no entry (nothing to fall back to)", () => {
    const template = getEnabledVenueDataTemplate(buildConfig());
    expect(template["Empty Disabled Section"]).toBeUndefined();
  });

  test("only sections with real configured rooms appear in the data template", () => {
    const template = getEnabledVenueDataTemplate(buildConfig());
    expect(Object.keys(template)).toEqual(["Agira Hall (A)"]);
    expect(template["Agira Hall (A)"].rooms).toEqual(["Main Floor"]);
  });

  test("an enabled section with zero rooms produces no card in booking form options either", () => {
    const options = getEnabledVenueFormOptions(buildConfig());
    expect(options.some((o) => o.hall === "Empty Section")).toBe(false);
  });
});
