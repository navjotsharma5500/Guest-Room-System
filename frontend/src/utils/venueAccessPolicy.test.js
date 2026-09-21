import { DD_ASSISTANT_ALLOWED_ROOMS, canAccessVenueRoom, hasVenueDashboardAccess, isDDOfficeRoom, filterVenueRoomsByRole } from "./venueAccessPolicy";

const tanVariants = ["TAN Auditorium", "tan auditorium", "  TAN Auditorium  ", "TAN-Auditorium"];
test("DD Assistant retains dashboard and only LT-201 / LT-202", () => {
  expect(DD_ASSISTANT_ALLOWED_ROOMS).toEqual(["LT-201", "LT-202"]);
  expect(hasVenueDashboardAccess("dd_assistant")).toBe(true);
  for (const room of ["LT-201", "LT-202"]) {
    expect(canAccessVenueRoom("dd_assistant", "", room)).toBe(true);
    expect(isDDOfficeRoom(room)).toBe(true);
  }
});
test.each(tanVariants)("DD Assistant cannot access %s", room => {
  expect(canAccessVenueRoom("dd_assistant", "", room)).toBe(false);
  expect(isDDOfficeRoom(room)).toBe(false);
});
test.each(["admin", "assistant", "adosa"])("%s retains TAN access", role => {
  for (const room of tanVariants) expect(canAccessVenueRoom(role, "", room)).toBe(true);
});
test("record filtering excludes TAN while retaining lecture theatres", () => {
  const rooms = ["LT-201", "LT-202", ...tanVariants].map(roomNo => ({ roomNo }));
  expect(filterVenueRoomsByRole(rooms, "dd_assistant")).toEqual(rooms.slice(0, 2));
});
