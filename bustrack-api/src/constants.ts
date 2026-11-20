export const ROLES = ["passenger", "driver", "admin"] as const;
export type UserRole = (typeof ROLES)[number];

export const DRIVER_STATUSES = ["pending", "approved", "suspended"] as const;
export type DriverStatus = (typeof DRIVER_STATUSES)[number];

export const BUS_STATUSES = ["active", "offline", "blocked"] as const;
export type BusStatus = (typeof BUS_STATUSES)[number];

export const BOOKING_STATUSES = ["confirmed", "boarded", "cancelled", "no_show"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const PAYMENT_STATUSES = ["due_on_board", "collected_on_board"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const ACCESS_REQUEST_STATUSES = ["pending", "approved", "rejected"] as const;
export type AccessRequestStatus = (typeof ACCESS_REQUEST_STATUSES)[number];

/** Bookings in these states hold seats on the bus. */
export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = ["confirmed", "boarded"];

export const LIMITS = {
  maxStops: 50,
  maxFarePairs: (50 * 49) / 2,
  maxSeatsPerBooking: 6,
  maxBusCapacity: 100,
  defaultBusCapacity: 40,
  passwordMin: 8,
  passwordMax: 72,
  bcryptRounds: 12,
  historyWindowHours: 2,
  historyMaxPoints: 200,
  bookingsListLimit: 50,
  driverBookingsLimit: 200,
} as const;
