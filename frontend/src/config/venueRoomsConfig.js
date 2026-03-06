export const venueRoomsConfig = [
  // 1) AUDITORIUM / HALLS
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
          { id: "tan-auditorium", name: "TAN Auditorium", enabled: true },
          { id: "deans-auditorium", name: "Dean's Auditorium", enabled: true },
          { id: "c-hall", name: "C-Hall", enabled: true },
        ],
      },
    ],
  },

  // 2) ROOMS
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
          { id: "lt-101", name: "LT-101", enabled: true },
          { id: "lt-102", name: "LT-102", enabled: false },
          { id: "lt-103", name: "LT-103", enabled: true },
          { id: "lt-105", name: "LT-105", enabled: true },
          { id: "lt-106", name: "LT-106", enabled: true },
          { id: "lt-108", name: "LT-108", enabled: true },
          { id: "lt-109", name: "LT-109", enabled: true },
          { id: "lt-201", name: "LT-201", enabled: true },
          { id: "lt-202", name: "LT-202", enabled: true },
          { id: "lt-301", name: "LT-301", enabled: true },
          { id: "lt-302", name: "LT-302", enabled: true },
          { id: "lt-303", name: "LT-303", enabled: true },
          { id: "lt-401", name: "LT-401", enabled: true },
          { id: "lt-402", name: "LT-402", enabled: true },
          { id: "lt-403", name: "LT-403", enabled: true },
        ],
      },
      {
        id: "lecture-pavilion",
        label: "Lecture Pavilion",
        enabled: true,
        rooms: [
          { id: "lp-101", name: "LP-101", enabled: true },
          { id: "lp-102", name: "LP-102", enabled: true },
          { id: "lp-103", name: "LP-103", enabled: true },
          { id: "lp-104", name: "LP-104", enabled: true },
          { id: "lp-105", name: "LP-105", enabled: true },
          { id: "lp-106", name: "LP-106", enabled: true },
          { id: "lp-107", name: "LP-107", enabled: true },
          { id: "lp-108", name: "LP-108", enabled: true },
          { id: "lp-109", name: "LP-109", enabled: true },
          { id: "lp-110", name: "LP-110", enabled: true },
        ],
      },
      {
        id: "tan-rooms",
        label: "TAN Rooms",
        enabled: true,
        rooms: [
          { id: "t-105", name: "T-105", enabled: true },
          { id: "t-106", name: "T-106", enabled: true },
        ],
      },
      {
        id: "e-block",
        label: "E-Block",
        enabled: true,
        rooms: [
          { id: "e-block", name: "E-Block", enabled: true },
        ],
      },
      {
        id: "f-block",
        label: "F-Block",
        enabled: true,
        rooms: [
          { id: "f-block", name: "F-Block", enabled: true },
        ],
      },
      {
        id: "g-block",
        label: "G-Block",
        enabled: true,
        rooms: [
          { id: "g-block", name: "G-Block", enabled: true },
        ],
      },
      {
        id: "activity-rooms",
        label: "Activity Rooms",
        enabled: true,
        rooms: [
          { id: "activity-room-1", name: "Activity Room - 1", enabled: true },
          { id: "activity-room-2", name: "Activity Room - 2", enabled: true },
          { id: "activity-room-3", name: "Activity Room - 3", enabled: true },
        ],
      },
      {
        id: "activity-space",
        label: "Activity Space",
        enabled: true,
        rooms: [
          { id: "activity-space-1", name: "Activity Space - 1", enabled: true },
          { id: "activity-space-2", name: "Activity Space - 2", enabled: true },
          { id: "activity-space-3", name: "Activity Space - 3", enabled: true },
        ],
      },
    ],
  },

  // 3) COS / CREATIVITY BLOCK
  {
    id: "creativity-block",
    label: "COS / Creativity Block",
    enabled: true,
    sections: [
      {
        id: "creativity-rooms",
        label: "Creativity Rooms",
        enabled: true,
        rooms: [
          { id: "cr-1", name: "CR-1", enabled: true },
          { id: "cr-2", name: "CR-2", enabled: true },
          { id: "cr-5-sur", name: "CR-5 (Sur Room)", enabled: true },
          { id: "cr-6", name: "CR-6", enabled: true },
          { id: "cr-7", name: "CR-7", enabled: true },
          { id: "cr-8", name: "CR-8", enabled: true },
        ],
      },
      {
        id: "green-rooms",
        label: "Green Rooms",
        enabled: true,
        rooms: [
          { id: "gr-1", name: "GR-1", enabled: true },
          { id: "gr-2", name: "GR-2", enabled: true },
        ],
      },
    ],
  },

  // 4) OPEN & DESK AREA
  {
    id: "open-areas",
    label: "Open & Desk Area",
    enabled: true,
    sections: [
      {
        id: "open-spaces",
        label: "Open Spaces",
        enabled: true,
        rooms: [
          { id: "k-lawn-street-cafe", name: "K-Lawn (Street Cafe)", enabled: true },
          { id: "deans-lawn", name: "Dean's Lawn", enabled: true },
          { id: "fete-area", name: "Fete Area", description: "(Near COS Gate Entry)", enabled: true },
          { id: "h-chowk", name: "H-Chowk", description: "(Near Central Park)", enabled: true },
          { id: "lp-lawns", name: "LP Lawns", enabled: true },
          { id: "csed", name: "CSED", description: "(hackathon Space)", enabled: true },
          { id: "sbi-lawn", name: "SBI Lawn", enabled: true },
          { id: "oat", name: "OAT (Open Air Theatre)", enabled: true },
          { id: "street-cafe", name: "Street Cafe", enabled: true },
          { id: "jaggi-area", name: "Jaggi Area", enabled: true },
          { id: "sports-complex", name: "Sports Complex", enabled: true },
        ],
      },
    ],
  },
];

const getEnabledRooms = (rooms = []) => rooms.filter((room) => room.enabled);

const getEnabledSections = (sections = []) =>
  sections
    .filter((section) => section.enabled)
    .map((section) => ({
      ...section,
      rooms: getEnabledRooms(section.rooms),
    }));

export const getEnabledVenueRoomsConfig = () =>
  venueRoomsConfig
    .filter((main) => main.enabled)
    .map((main) => ({
      ...main,
      sections: getEnabledSections(main.sections),
    }));

export const getEnabledVenueSectionEntries = ({ includeEmpty = true } = {}) => {
  const entries = [];
  getEnabledVenueRoomsConfig().forEach((main) => {
    main.sections.forEach((section) => {
      if (!includeEmpty && (!Array.isArray(section.rooms) || section.rooms.length === 0)) {
        return;
      }
      entries.push({
        mainId: main.id,
        mainLabel: main.label,
        sectionId: section.id,
        sectionLabel: section.label,
        rooms: section.rooms,
      });
    });
  });
  return entries;
};

export const getEnabledVenueDataTemplate = () => {
  const template = {};
  getEnabledVenueSectionEntries({ includeEmpty: false }).forEach((entry) => {
    template[entry.sectionLabel] = {
      rooms: entry.rooms.map((room) => room.name),
    };
  });
  return template;
};

export const getEnabledVenueFormOptions = () =>
  getEnabledVenueSectionEntries({ includeEmpty: false }).map((entry) => ({
    groupId: entry.sectionId,
    groupLabel: `${entry.mainLabel} / ${entry.sectionLabel}`,
    hall: entry.sectionLabel,
    rooms: entry.rooms.map((room) => room.name),
  }));

const enabledSectionLabelById = {};
getEnabledVenueSectionEntries({ includeEmpty: true }).forEach((entry) => {
  enabledSectionLabelById[entry.sectionId] = entry.sectionLabel;
});

export const getEnabledVenueSectionLabelById = (sectionId = "") =>
  enabledSectionLabelById[sectionId] || null;
