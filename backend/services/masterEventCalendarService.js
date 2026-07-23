import VenueBooking from "../models/VenueBooking.js";
import EventCalendar from "../models/EventCalendar.js";
import MasterEventCalendarOverride from "../models/MasterEventCalendarOverride.js";

const CACHE_TTL_MS = 30 * 1000;
const COLOR_CACHE_TTL_MS = 60 * 1000;
const DEFAULT_TIMEOUT_MS = Number(process.env.CALENDAR_API_TIMEOUT_MS || 8000);

const cache = new Map();

const toDateKey = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const to12Hour = (timeString = "") => {
  if (!timeString) return "";
  if (/\b(AM|PM)\b/i.test(timeString)) return timeString;
  const [hRaw, mRaw] = String(timeString).split(":").map(Number);
  if (Number.isNaN(hRaw)) return timeString;
  const period = hRaw >= 12 ? "PM" : "AM";
  const hour12 = hRaw % 12 || 12;
  return `${hour12}:${String(mRaw || 0).padStart(2, "0")} ${period}`;
};

const parseMinutes = (timeString = "") => {
  const trimmed = String(timeString || "").trim();
  if (!trimmed) return 0;
  if (/\b(AM|PM)\b/i.test(trimmed)) {
    const [timePart, periodRaw] = trimmed.split(/\s+/);
    const [hRaw, mRaw] = timePart.split(":").map(Number);
    let hours = hRaw || 0;
    const period = String(periodRaw || "").toUpperCase();
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return hours * 60 + (mRaw || 0);
  }
  const [hours, minutes] = trimmed.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const cacheGet = (key) => {
  const item = cache.get(key);
  if (!item || item.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return item.value;
};

const cacheSet = (key, value, ttl = CACHE_TTL_MS) => {
  cache.set(key, { value, expiresAt: Date.now() + ttl });
};

export const invalidateMasterCalendarCache = () => {
  cache.clear();
};

const buildUrl = (baseUrl, path, params = {}) => {
  const url = new URL(path, `${String(baseUrl || "").replace(/\/$/, "")}/`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return url;
};

const fetchIntegration = async (sourceKey, baseUrl, path, params = {}) => {
  if (!baseUrl || !process.env.CALENDAR_INTERNAL_API_KEY) {
    return { available: false, count: 0, data: [], error: "Integration URL/key not configured" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetch(buildUrl(baseUrl, path, params), {
      headers: { "x-calendar-api-key": process.env.CALENDAR_INTERNAL_API_KEY },
      signal: controller.signal,
    });
    if (!response.ok) {
      return { available: false, count: 0, data: [], error: `${sourceKey} returned ${response.status}` };
    }
    const json = await response.json();
    const data = json && Object.prototype.hasOwnProperty.call(json, "data") ? json.data : json;
    return {
      available: true,
      count: Array.isArray(data) ? data.length : 0,
      data,
      pagination: json.pagination || null,
    };
  } catch (err) {
    return { available: false, count: 0, data: [], error: err.name === "AbortError" ? "Request timed out" : err.message };
  } finally {
    clearTimeout(timeout);
  }
};

const normalizeVenueBooking = (booking) => ({
  unifiedId: `venue:${booking._id}`,
  sourceId: String(booking._id),
  sourceType: "venue-booking",
  calendarType: booking.bookingFor || "institute_calendar",
  recordType: "event",
  eventName: booking.eventName || "Venue Booking",
  societyName: booking.societyName || booking.name || "Venue",
  department: booking.department || "",
  eventDate: toDateKey(booking.checkInDate),
  eventEndDate: toDateKey(booking.checkOutDate || booking.checkInDate),
  eventTime: to12Hour(booking.checkInTime),
  checkOutTime: to12Hour(booking.checkOutTime),
  eventHall: { hall: booking.hall || "", roomNo: booking.roomNo || "" },
  description: booking.description || "",
  purpose: booking.purpose || "",
  attachments: booking.attachments || [],
  sourceStatus: booking.status || "",
  bookingStatus: booking.status || "",
  conflictResolved: booking.conflictResolved === true,
  conflictResolvedAt: booking.conflictResolvedAt,
  conflictResolvedBy: booking.conflictResolvedBy || "",
  conflictResolutionRemarks: booking.conflictResolutionRemarks || "",
  hiddenFromMasterCalendar: booking.hiddenFromMasterCalendar === true,
  createdAt: booking.createdAt,
  updatedAt: booking.updatedAt,
  editable: true,
  deletable: true,
});

const normalizeLegacyEvent = (event) => ({
  unifiedId: `event:${event._id}`,
  sourceId: String(event._id),
  sourceType: "venue-booking",
  calendarType: "institute_calendar",
  recordType: "event",
  eventName: event.eventName || "Event",
  societyName: event.societyName || "Venue",
  department: "",
  eventDate: toDateKey(event.eventDate),
  eventEndDate: toDateKey(event.eventEndDate || event.eventDate),
  eventTime: event.eventTime || "",
  checkOutTime: event.checkOutTime || "",
  eventHall: event.eventHall || { hall: "", roomNo: "" },
  description: event.description || "",
  purpose: "",
  attachments: event.attachments || [],
  sourceStatus: event.status || "",
  conflictResolved: event.conflictResolved === true,
  conflictResolvedAt: event.conflictResolvedAt,
  conflictResolvedBy: event.conflictResolvedBy || "",
  conflictResolutionRemarks: event.conflictResolutionRemarks || "",
  hiddenFromMasterCalendar: event.hiddenFromMasterCalendar === true,
  createdAt: event.createdAt,
  updatedAt: event.updatedAt,
  editable: true,
  deletable: true,
});

const normalizeRemoteEvent = (event, sourceType, calendarType) => ({
  unifiedId: `${sourceType === "student-calendar" ? "student" : "institute"}:${event._id}`,
  sourceId: String(event._id),
  sourceType,
  calendarType,
  recordType: "event",
  eventName: event.event || event.eventName || "Event",
  societyName: event.society || event.societyName || (sourceType === "student-calendar" ? "Student Calendar" : "Institute Calendar"),
  department: event.department || "",
  eventDate: toDateKey(event.startDate || event.eventDate),
  eventEndDate: toDateKey(event.endDate || event.eventEndDate || event.startDate || event.eventDate),
  eventTime: to12Hour(event.startTime || event.eventTime),
  checkOutTime: to12Hour(event.endTime || event.checkOutTime),
  eventHall: { hall: event.venue || "", roomNo: event.roomNo || "" },
  description: event.description || "",
  purpose: event.purpose || "",
  attachments: event.attachments || [],
  sourceStatus: event.status || "",
  conflict: event.conflict,
  conflictResolved: event.conflictResolved === true,
  conflictResolvedAt: event.conflictResolvedAt,
  conflictResolvedBy: event.conflictResolvedBy || "",
  conflictResolutionRemarks: event.conflictResolutionRemarks || "",
  createdAt: event.createdAt,
  updatedAt: event.updatedAt,
  editable: true,
  deletable: true,
});

const normalizeHoliday = (holiday) => ({
  unifiedId: `student-holiday:${holiday._id}`,
  sourceId: String(holiday._id),
  sourceType: "student-calendar",
  calendarType: "student_calendar",
  recordType: "holiday",
  eventName: holiday.description || "Holiday",
  societyName: "Holiday",
  department: "",
  eventDate: toDateKey(holiday.date),
  eventEndDate: toDateKey(holiday.date),
  eventTime: "",
  checkOutTime: "",
  eventHall: { hall: "", roomNo: "" },
  description: holiday.description || "",
  purpose: "",
  attachments: [],
  sourceStatus: "holiday",
  createdAt: holiday.createdAt,
  updatedAt: holiday.updatedAt,
  editable: false,
  deletable: false,
});

const normalizeTeachingDay = (mapping) => ({
  unifiedId: `student-teaching-day:${mapping._id}`,
  sourceId: String(mapping._id),
  sourceType: "student-calendar",
  calendarType: "student_calendar",
  recordType: "teaching-day",
  eventName: "Teaching Day in lieu of Non-Teaching Day",
  societyName: "Teaching Day",
  department: "",
  eventDate: toDateKey(mapping.nonTeachingDate),
  eventEndDate: toDateKey(mapping.nonTeachingDate),
  nonTeachingDate: toDateKey(mapping.nonTeachingDate),
  teachingDates: (Array.isArray(mapping.teachingDates) ? mapping.teachingDates : [mapping.teachingDates])
    .map(toDateKey)
    .filter(Boolean),
  eventTime: "",
  checkOutTime: "",
  eventHall: { hall: "", roomNo: "" },
  description: mapping.description || "",
  remarks: mapping.remarks || "",
  purpose: "",
  attachments: [],
  sourceStatus: "teaching-day",
  createdAt: mapping.createdAt,
  updatedAt: mapping.updatedAt,
  editable: false,
  deletable: false,
});

const dedupeEvents = (events) => {
  const seen = new Set();
  return events.filter((event) => {
    const explicitKey = `${event.sourceType}:${event.sourceId}`;
    if (seen.has(explicitKey)) return false;
    seen.add(explicitKey);
    return true;
  });
};

const sortEvents = (events) => [...events].sort((a, b) => {
  if ((a.eventDate || "") !== (b.eventDate || "")) return (a.eventDate || "").localeCompare(b.eventDate || "");
  return parseMinutes(a.eventTime) - parseMinutes(b.eventTime);
});

const applyFilters = (events, filters = {}) => {
  const search = String(filters.search || "").trim().toLowerCase();
  return events.filter((event) => {
    const start = event.eventDate;
    const end = event.eventEndDate || event.eventDate;
    if (filters.sourceType && event.sourceType !== filters.sourceType) return false;
    if (filters.calendarType && event.calendarType !== filters.calendarType) return false;
    if (filters.recordType && event.recordType !== filters.recordType) return false;
    if (filters.startDate && end < filters.startDate) return false;
    if (filters.endDate && start > filters.endDate) return false;
    if (filters.venue) {
      const venue = `${event.eventHall?.hall || ""} ${event.eventHall?.roomNo || ""}`.toLowerCase();
      if (!venue.includes(String(filters.venue).toLowerCase())) return false;
    }
    if (filters.hall && !String(event.eventHall?.hall || "").toLowerCase().includes(String(filters.hall).toLowerCase())) return false;
    if (filters.roomNo && !String(event.eventHall?.roomNo || "").toLowerCase().includes(String(filters.roomNo).toLowerCase())) return false;
    if (filters.department && !String(event.department || "").toLowerCase().includes(String(filters.department).toLowerCase())) return false;
    if (filters.societyName && !String(event.societyName || "").toLowerCase().includes(String(filters.societyName).toLowerCase())) return false;
    if (search) {
      const haystack = [
        event.eventName,
        event.societyName,
        event.department,
        event.eventHall?.hall,
        event.eventHall?.roomNo,
        event.description,
        event.purpose,
      ].join(" ").toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
};

const getLocalEvents = async ({ startDate, endDate } = {}) => {
  const bookingQuery = {
    status: { $nin: ["cancelled", "no_show"] },
    hiddenFromMasterCalendar: { $ne: true },
  };
  if (startDate || endDate) {
    bookingQuery.checkInDate = { $lte: endDate || "9999-12-31" };
    bookingQuery.checkOutDate = { $gte: startDate || "0000-01-01" };
  }
  const legacyEventQuery = {
    hiddenFromMasterCalendar: { $ne: true },
  };
  if (startDate || endDate) {
    legacyEventQuery.eventDate = { $lte: endDate || "9999-12-31", $gte: startDate || "0000-01-01" };
  }

  const [venueBookings, legacyEvents] = await Promise.all([
    VenueBooking.find(bookingQuery)
      .select("hall roomNo name societyName eventName department contact email checkInDate checkInTime checkOutDate checkOutTime purpose description attachments status bookingFor enquiryId conflictResolved conflictResolvedAt conflictResolvedBy conflictResolutionRemarks hiddenFromMasterCalendar createdAt updatedAt")
      .lean(),
    EventCalendar.find(legacyEventQuery)
      .select("eventName societyName eventDate eventEndDate eventTime checkOutTime eventHall attachments status linkedVenueBooking description conflictResolved conflictResolvedAt conflictResolvedBy conflictResolutionRemarks hiddenFromMasterCalendar createdAt updatedAt")
      .lean(),
  ]);

  const linkedBookingIds = new Set(
    legacyEvents.map((event) => String(event.linkedVenueBooking || "")).filter(Boolean)
  );

  const events = [
    ...venueBookings.filter((booking) => !linkedBookingIds.has(String(booking._id))).map(normalizeVenueBooking),
    ...legacyEvents.filter((event) => !event.linkedVenueBooking).map(normalizeLegacyEvent),
  ];

  return events;
};

const applyMasterCalendarOverrides = async (events) => {
  const unifiedIds = events.map((event) => event.unifiedId).filter(Boolean);
  if (!unifiedIds.length) return events;

  const overrides = await MasterEventCalendarOverride.find({
    unifiedId: { $in: unifiedIds },
  }).lean();
  const overrideById = new Map(overrides.map((override) => [override.unifiedId, override]));

  return events
    .filter((event) => {
      const override = overrideById.get(event.unifiedId);
      return override?.hiddenFromMasterCalendar !== true && event.hiddenFromMasterCalendar !== true;
    })
    .map((event) => {
      const override = overrideById.get(event.unifiedId);
      if (!override?.conflictResolved) return event;

      return {
        ...event,
        conflictResolved: true,
        conflictResolvedAt: override.conflictResolvedAt,
        conflictResolvedBy: override.conflictResolvedBy || "",
        conflictResolutionRemarks: override.conflictResolutionRemarks || "",
      };
    });
};

export const getMasterEvents = async (filters = {}) => {
  const cacheKey = `events:${JSON.stringify(filters)}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const startDate = filters.startDate;
  const endDate = filters.endDate;
  const remoteParams = { startDate, endDate, limit: 200 };

  const [localResult, studentResult, instituteResult, holidaysResult, teachingResult] = await Promise.allSettled([
    getLocalEvents({ startDate, endDate }),
    fetchIntegration("student", process.env.STUDENT_CALENDAR_API_URL, "api/integration/events", remoteParams),
    fetchIntegration("institute", process.env.INSTITUTE_CALENDAR_API_URL, "api/integration/events", remoteParams),
    fetchIntegration("student-holidays", process.env.STUDENT_CALENDAR_API_URL, "api/integration/holidays", { start: startDate, end: endDate }),
    fetchIntegration("student-teaching", process.env.STUDENT_CALENDAR_API_URL, "api/integration/teaching-days", { start: startDate, end: endDate }),
  ]);

  const localEvents = localResult.status === "fulfilled" ? localResult.value : [];
  const studentPayload = studentResult.status === "fulfilled" ? studentResult.value : { available: false, data: [] };
  const institutePayload = instituteResult.status === "fulfilled" ? instituteResult.value : { available: false, data: [] };
  const holidaysPayload = holidaysResult.status === "fulfilled" ? holidaysResult.value : { available: false, data: [] };
  const teachingPayload = teachingResult.status === "fulfilled" ? teachingResult.value : { available: false, data: [] };

  const merged = await applyMasterCalendarOverrides(dedupeEvents([
    ...localEvents,
    ...(studentPayload.data || []).map((event) => normalizeRemoteEvent(event, "student-calendar", "student_calendar")),
    ...(institutePayload.data || []).map((event) => normalizeRemoteEvent(event, "institute-calendar", "institute_calendar")),
    ...(holidaysPayload.data || []).map(normalizeHoliday),
    ...(teachingPayload.data || []).map(normalizeTeachingDay),
  ]));

  const filtered = sortEvents(applyFilters(merged, filters));
  const result = {
    events: filtered,
    sources: {
      venue: { available: localResult.status === "fulfilled", count: localEvents.length },
      student: { available: studentPayload.available === true, count: studentPayload.count || 0, error: studentPayload.error },
      institute: { available: institutePayload.available === true, count: institutePayload.count || 0, error: institutePayload.error },
      holidays: { available: holidaysPayload.available === true, count: (holidaysPayload.data || []).length, error: holidaysPayload.error },
      teachingDays: { available: teachingPayload.available === true, count: (teachingPayload.data || []).length, error: teachingPayload.error },
    },
  };
  cacheSet(cacheKey, result);
  return result;
};

export const paginateEvents = (events, page = 1, limit = 50) => {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.max(Number(limit) || 50, 1);
  const total = events.length;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const start = (safePage - 1) * safeLimit;
  return {
    events: events.slice(start, start + safeLimit),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPreviousPage: safePage > 1,
    },
  };
};

export const getStudentDateColors = async ({ start, end } = {}) => {
  const cacheKey = `date-colors:${start || ""}:${end || ""}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const directMapPayload = await fetchIntegration(
    "student-calendar-color-map",
    process.env.STUDENT_CALENDAR_API_URL,
    "api/calendar-color-map",
    { start, end }
  );

  if (directMapPayload.available && directMapPayload.data && !Array.isArray(directMapPayload.data)) {
    const map = directMapPayload.data;
    const categories = [];
    const seenCategoryIds = new Set();

    Object.values(map).forEach((dateColorValue) => {
      const colors = Array.isArray(dateColorValue) ? dateColorValue : [dateColorValue];
      colors.filter(Boolean).forEach((category) => {
        const id = String(category._id || category.name || category.color);
        if (seenCategoryIds.has(id)) return;
        seenCategoryIds.add(id);
        categories.push(category);
      });
    });

    const result = {
      success: true,
      data: { categories, single: [], ranges: [], map },
      sources: { student: directMapPayload },
    };
    cacheSet(cacheKey, result, COLOR_CACHE_TTL_MS);
    return result;
  }

  const payload = await fetchIntegration(
    "student-date-colors",
    process.env.STUDENT_CALENDAR_API_URL,
    "api/integration/date-colors",
    { start, end }
  );
  const raw = payload.data || {};
  const categories = raw.categories || [];
  const single = raw.single || [];
  const ranges = raw.ranges || [];
  const map = {};

  const addColor = (dateKey, category) => {
    if (!dateKey || !category?.isActive) return;
    if (!map[dateKey]) map[dateKey] = [];
    map[dateKey].push({
      _id: category._id,
      name: category.name,
      color: category.color,
      description: category.description,
      isActive: category.isActive,
      showDescription: category.showDescription !== false,
    });
  };

  ranges.forEach((assignment) => {
    const category = assignment.categoryId;
    const first = assignment.startDate < (start || "0000-01-01") ? start : assignment.startDate;
    const last = assignment.endDate > (end || "9999-12-31") ? end : assignment.endDate;
    if (!first || !last || first > last) return;
    let cursor = new Date(`${first}T00:00:00`);
    const lastDate = new Date(`${last}T00:00:00`);
    while (cursor <= lastDate) {
      addColor(toDateKey(cursor), category);
      cursor = addDays(cursor, 1);
    }
  });

  single.forEach((assignment) => {
    if ((start && assignment.date < start) || (end && assignment.date > end)) return;
    addColor(assignment.date, assignment.categoryId);
  });

  const result = { success: true, data: { categories, single, ranges, map }, sources: { student: payload } };
  cacheSet(cacheKey, result, COLOR_CACHE_TTL_MS);
  return result;
};

export const getSourceEvent = async (unifiedId) => {
  const [source, id] = String(unifiedId || "").split(":");
  if (!source || !id) return null;
  if (source === "venue") return VenueBooking.findById(id).lean();
  if (source === "event") return EventCalendar.findById(id).lean();
  const baseUrl = source === "student" ? process.env.STUDENT_CALENDAR_API_URL : process.env.INSTITUTE_CALENDAR_API_URL;
  const payload = await fetchIntegration(source, baseUrl, `api/integration/events/${id}`);
  return payload.available ? payload.data : null;
};
