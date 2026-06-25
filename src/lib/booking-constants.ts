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

export const JOB_TYPES = [
  "Leak Repair",
  "Drain Blockage",
  "New Fitting Installation",
  "Pipe Replacement",
  "Water Tank Issue",
  "Other",
] as const;

export type JobType = (typeof JOB_TYPES)[number];

export const BOOKING_STATUSES = [
  "Pending",
  "Confirmed",
  "In Progress",
  "Completed",
  "Cancelled",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];
