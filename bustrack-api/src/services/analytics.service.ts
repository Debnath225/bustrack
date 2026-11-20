import { env } from "../config/env";
import { Booking } from "../models/Booking";
import { Bus } from "../models/Bus";
import { LocationPing } from "../models/LocationPing";
import { Route } from "../models/Route";
import { User } from "../models/User";
import { getIndiaServiceDate, shiftServiceDate } from "./booking.rules";

export async function getOverview() {
  const cutoff = new Date(Date.now() - env.LOCATION_STALE_SECONDS * 1000);
  const [buses, users, routes, activeBuses] = await Promise.all([
    Bus.countDocuments(),
    User.countDocuments(),
    Route.countDocuments(),
    Bus.countDocuments({ lastSeen: { $gte: cutoff } }),
  ]);
  return { buses, users, routes, activeBuses };
}

export async function getAnalytics(days: 7 | 30) {
  const today = getIndiaServiceDate();
  const start = shiftServiceDate(today, -(days - 1));
  const match = { $match: { travelDate: { $gte: start, $lte: today } } };

  type DailyRow = { _id: string; bookings: number; boarded: number; confirmed: number };
  type TotalRow = { bookings: number; boarded: number; collectedFare: number };

  const [daily, totals, fleet] = await Promise.all([
    Booking.aggregate<DailyRow>([
      match,
      {
        $group: {
          _id: "$travelDate",
          bookings: { $sum: 1 },
          boarded: { $sum: { $cond: [{ $eq: ["$status", "boarded"] }, 1, 0] } },
          confirmed: { $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] } },
        },
      },
    ]),
    Booking.aggregate<TotalRow>([
      match,
      {
        $group: {
          _id: null,
          bookings: { $sum: 1 },
          boarded: { $sum: { $cond: [{ $eq: ["$status", "boarded"] }, 1, 0] } },
          collectedFare: { $sum: { $cond: [{ $eq: ["$status", "boarded"] }, "$totalFare", 0] } },
        },
      },
    ]),
    Bus.aggregate<{ _id: string; count: number }>([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);

  const byDay = new Map(daily.map((row): [string, DailyRow] => [row._id, row]));
  const bookingsByDay = Array.from({ length: days }, (_, index) => {
    const day = shiftServiceDate(start, index);
    const row = byDay.get(day);
    return {
      day,
      bookings: row?.bookings ?? 0,
      boarded: row?.boarded ?? 0,
      confirmed: row?.confirmed ?? 0,
    };
  });

  return {
    days,
    startDate: start,
    endDate: today,
    bookingsByDay,
    fleetByStatus: fleet.map((row) => ({ status: row._id, count: row.count })),
    totals: totals[0] ?? { bookings: 0, boarded: 0, collectedFare: 0 },
  };
}

export async function getActivity() {
  const events = await LocationPing.find().sort({ recordedAt: -1 }).limit(50).lean();
  return events.map((e) => ({
    bus_id: e.busId,
    latitude: e.lat,
    longitude: e.lon,
    source: e.source,
    recorded_at: e.recordedAt,
  }));
}
