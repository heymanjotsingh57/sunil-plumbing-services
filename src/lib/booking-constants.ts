export const TIME_SLOTS = [
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
  "6:00 PM",
] as const;

export type TimeSlot = (typeof TIME_SLOTS)[number];

export const ACCESS_CODE = "SUNIL2026";
export const ACCESS_STORAGE_KEY = "sunil_schedule_access";
