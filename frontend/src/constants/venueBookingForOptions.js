export const DEFAULT_VENUE_BOOKING_FOR = "institute_calendar";

export const VENUE_BOOKING_FOR_OPTIONS = [
  {
    value: "student_calendar",
    label: "Student Event Calendar",
  },
  {
    value: "institute_calendar",
    label: "Institute Event Calendar",
  },
];

export const isValidVenueBookingFor = (value) =>
  VENUE_BOOKING_FOR_OPTIONS.some((option) => option.value === value);

export const getVenueBookingForLabel = (value) =>
  VENUE_BOOKING_FOR_OPTIONS.find((option) => option.value === value)?.label ||
  VENUE_BOOKING_FOR_OPTIONS.find(
    (option) => option.value === DEFAULT_VENUE_BOOKING_FOR
  )?.label ||
  "Institute Event Calendar";
