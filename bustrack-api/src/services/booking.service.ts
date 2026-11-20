import { randomBytes } from "crypto";
import { Types, type ClientSession, type FilterQuery } from "mongoose";
import { ACTIVE_BOOKING_STATUSES, LIMITS } from "../constants";
import { Booking, type IBooking } from "../models/Booking";
import { Bus, type IBus } from "../models/Bus";
import { Route, type IStop, type RouteLean } from "../models/Route";
import { HttpError } from "../utils/httpError";
import { assertObjectId } from "../utils/ids";
import { runInTransaction } from "../utils/transaction";
import { busIsLive, findDriverBus, routesById } from "./bus.service";
import { userNames } from "./user.service";
import {
  calculateTotalFare,
  getIndiaServiceDate,
  normalizeStopRange,
  type StopRange,
} from "./booking.rules";

type BookingLike = IBooking & { _id: Types.ObjectId };
type BusContext = { busLabel: string; routeName: string | null; stops: IStop[] };

const NOT_CANCELLABLE = "This ticket can no longer be cancelled in the app.";

function stopName(stops: IStop[], index: number): string {
  return stops[index]?.name ?? "Unknown stop";
}

function findFare(fares: IBus["fares"], range: StopRange) {
  return fares.find((fare) => fare.fromStopIndex === range.start && fare.toStopIndex === range.end);
}

function newBookingReference(): string {
  return randomBytes(6).toString("hex").toUpperCase();
}

function toBookingView(booking: BookingLike, ctx: BusContext, passengerName?: string) {
  return {
    id: booking._id.toString(),
    bookingReference: booking.bookingReference,
    travelDate: booking.travelDate,
    busId: booking.busId,
    busLabel: ctx.busLabel,
    routeName: ctx.routeName,
    fromStopIndex: booking.fromStopIndex,
    toStopIndex: booking.toStopIndex,
    fromStop: stopName(ctx.stops, booking.fromStopIndex),
    toStop: stopName(ctx.stops, booking.toStopIndex),
    seats: booking.seats,
    unitFare: booking.unitFare,
    totalFare: booking.totalFare,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    boardedAt: booking.boardedAt,
    createdAt: booking.createdAt,
    ...(passengerName !== undefined ? { passengerName } : {}),
  };
}

async function loadBusContexts(busIds: string[]): Promise<Map<string, BusContext>> {
  const buses = await Bus.find({ _id: { $in: busIds } })
    .select("label routeId")
    .lean<Array<{ _id: string; label: string; routeId: Types.ObjectId | null }>>();
  const routes = await routesById(buses.map((bus) => bus.routeId));
  return new Map(
    buses.map((bus): [string, BusContext] => {
      const route = bus.routeId ? routes.get(String(bus.routeId)) : undefined;
      return [bus._id, { busLabel: bus.label, routeName: route?.name ?? null, stops: route?.stops ?? [] }];
    }),
  );
}

function contextFor(contexts: Map<string, BusContext>, busId: string): BusContext {
  return contexts.get(busId) ?? { busLabel: "Unknown bus", routeName: null, stops: [] };
}

async function loadBookableBus(busId: string, session?: ClientSession) {
  const bus = await Bus.findById(busId).session(session ?? null);
  if (!bus) throw new HttpError(404, "Bus not found.");
  const route = bus.routeId
    ? await Route.findById(bus.routeId).session(session ?? null).lean<RouteLean>()
    : null;
  if (!route) throw new HttpError(409, "This bus does not have a route with stops.");
  return { bus, route };
}

/** Seats already held on this segment for the service date. */
async function reservedSeats(
  busId: string,
  travelDate: string,
  range: StopRange,
  session?: ClientSession,
): Promise<number> {
  const [row] = await Booking.aggregate<{ reserved: number }>([
    {
      $match: {
        busId,
        travelDate,
        status: { $in: ACTIVE_BOOKING_STATUSES },
        segmentStart: { $lt: range.end },
        segmentEnd: { $gt: range.start },
      },
    },
    { $group: { _id: null, reserved: { $sum: "$seats" } } },
  ]).session(session ?? null);
  return Number(row?.reserved ?? 0);
}

// ---------- passenger ----------

export async function getAvailability(busId: string, fromStopIndex: number, toStopIndex: number) {
  const { bus, route } = await loadBookableBus(busId);
  const range = normalizeStopRange(fromStopIndex, toStopIndex, route.stops.length);
  if (!range) throw new HttpError(400, "Choose two different stops on this route.");

  const travelDate = getIndiaServiceDate();
  const live = busIsLive(bus);
  const enabled = bus.bookingsEnabled;
  const reserved = enabled && live ? await reservedSeats(bus._id, travelDate, range) : 0;

  return {
    enabled,
    live,
    travelDate,
    fromStop: stopName(route.stops, fromStopIndex),
    toStop: stopName(route.stops, toStopIndex),
    unitFare: findFare(bus.fares, range)?.amount ?? null,
    seatsAvailable: enabled && live ? Math.max(0, bus.capacity - reserved) : 0,
  };
}

export async function createBooking(
  userId: string,
  input: { busId: string; fromStopIndex: number; toStopIndex: number; seats: number },
) {
  return runInTransaction(async (session) => {
    // Touching the bus document serialises concurrent bookings on the same bus.
    await Bus.updateOne({ _id: input.busId }, { $inc: { bookingLockVersion: 1 } }, { session });
    const { bus, route } = await loadBookableBus(input.busId, session);

    if (!bus.bookingsEnabled) throw new HttpError(409, "The driver is not accepting bookings for this bus.");
    if (!busIsLive(bus)) throw new HttpError(409, "This bus is not currently live. Try again when it is on duty.");

    const range = normalizeStopRange(input.fromStopIndex, input.toStopIndex, route.stops.length);
    if (!range) throw new HttpError(400, "Choose two different stops on this route.");

    const fare = findFare(bus.fares, range);
    if (!fare) throw new HttpError(409, "The driver has not set a fare for this stop pair.");

    const travelDate = getIndiaServiceDate();
    const reserved = await reservedSeats(bus._id, travelDate, range, session);
    if (reserved + input.seats > bus.capacity) {
      throw new HttpError(
        409,
        `Only ${Math.max(0, bus.capacity - reserved)} reserved seat(s) remain for this part of the route.`,
      );
    }

    const [booking] = await Booking.create(
      [
        {
          bookingReference: newBookingReference(),
          userId: new Types.ObjectId(userId),
          busId: bus._id,
          travelDate,
          fromStopIndex: input.fromStopIndex,
          toStopIndex: input.toStopIndex,
          segmentStart: range.start,
          segmentEnd: range.end,
          seats: input.seats,
          unitFare: fare.amount,
          totalFare: calculateTotalFare(fare.amount, input.seats),
        },
      ],
      { session },
    );

    return {
      booking: toBookingView(booking as BookingLike, { busLabel: bus.label, routeName: route.name, stops: route.stops }),
    };
  });
}

export async function listPassengerBookings(userId: string) {
  const bookings = await Booking.find({ userId: new Types.ObjectId(userId) })
    .sort({ travelDate: -1, createdAt: -1 })
    .limit(LIMITS.bookingsListLimit);
  const contexts = await loadBusContexts([...new Set(bookings.map((b) => b.busId))]);
  return {
    serviceDate: getIndiaServiceDate(),
    bookings: bookings.map((b) => toBookingView(b, contextFor(contexts, b.busId))),
  };
}

export async function getPassengerBooking(userId: string, bookingId: string) {
  assertObjectId(bookingId, "Booking not found.");
  const booking = await Booking.findOne({ _id: bookingId, userId: new Types.ObjectId(userId) });
  if (!booking) throw new HttpError(404, "Booking not found.");
  const contexts = await loadBusContexts([booking.busId]);
  return { booking: toBookingView(booking, contextFor(contexts, booking.busId)) };
}

export async function cancelBooking(userId: string, bookingId: string): Promise<void> {
  assertObjectId(bookingId, "Booking not found.");
  const booking = await Booking.findOne({ _id: bookingId, userId: new Types.ObjectId(userId) });
  if (!booking) throw new HttpError(404, "Booking not found.");
  if (booking.status !== "confirmed" || booking.travelDate !== getIndiaServiceDate()) {
    throw new HttpError(409, NOT_CANCELLABLE);
  }
  // Conditional update: only one request can win if cancel and board race.
  const result = await Booking.updateOne(
    { _id: booking._id, status: "confirmed" },
    { $set: { status: "cancelled", cancelledAt: new Date() } },
  );
  if (!result.modifiedCount) throw new HttpError(409, NOT_CANCELLABLE);
}

// ---------- driver ----------

async function requireDriverBus(driverId: string) {
  const bus = await findDriverBus(driverId);
  if (!bus) throw new HttpError(409, "No bus is assigned to this driver.");
  return bus;
}

export async function getDriverBookingSettings(driverId: string) {
  const bus = await requireDriverBus(driverId);
  const route = bus.routeId ? await Route.findById(bus.routeId).select("name").lean<RouteLean>() : null;
  return {
    bus: {
      busId: bus._id,
      label: bus.label,
      capacity: bus.capacity,
      routeName: route?.name ?? null,
      live: busIsLive(bus),
      enabled: bus.bookingsEnabled,
      hasRoute: Boolean(bus.routeId),
    },
  };
}

export async function setDriverBookingEnabled(driverId: string, enabled: boolean) {
  const bus = await requireDriverBus(driverId);
  if (enabled && !bus.routeId) {
    throw new HttpError(409, "A route with stops must be assigned before accepting bookings.");
  }
  bus.bookingsEnabled = enabled;
  await bus.save();
  return { enabled };
}

export async function getDriverBookings(driverId: string) {
  const bus = await requireDriverBus(driverId);
  const today = getIndiaServiceDate();
  const bookings = await Booking.find({ busId: bus._id, travelDate: today })
    .sort({ createdAt: 1 })
    .limit(LIMITS.driverBookingsLimit);
  const route = bus.routeId ? await Route.findById(bus.routeId).lean<RouteLean>() : null;
  const names = await userNames(bookings.map((b) => b.userId));
  const ctx: BusContext = { busLabel: bus.label, routeName: route?.name ?? null, stops: route?.stops ?? [] };
  return {
    busId: bus._id,
    travelDate: today,
    bookings: bookings.map((b) => toBookingView(b, ctx, names.get(String(b.userId)) ?? "Passenger")),
  };
}

async function updateTodaysConfirmedBooking(
  driverId: string,
  bookingId: string,
  set: Partial<Pick<IBooking, "status" | "paymentStatus" | "boardedAt">>,
): Promise<void> {
  assertObjectId(bookingId, "Ticket not found.");
  const bus = await requireDriverBus(driverId);
  const result = await Booking.updateOne(
    { _id: bookingId, busId: bus._id, travelDate: getIndiaServiceDate(), status: "confirmed" },
    { $set: set },
  );
  if (!result.modifiedCount) throw new HttpError(409, "Ticket is no longer awaiting boarding.");
}

export async function markBoarded(driverId: string, bookingId: string): Promise<void> {
  await updateTodaysConfirmedBooking(driverId, bookingId, {
    status: "boarded",
    paymentStatus: "collected_on_board",
    boardedAt: new Date(),
  });
}

export async function markNoShow(driverId: string, bookingId: string): Promise<void> {
  await updateTodaysConfirmedBooking(driverId, bookingId, { status: "no_show" });
}

// ---------- admin ----------

export async function listAllBookings(query: {
  date?: string;
  busId?: string;
  status?: IBooking["status"];
  page: number;
  limit: number;
}) {
  const filter: FilterQuery<IBooking> = {};
  if (query.date) filter.travelDate = query.date;
  if (query.busId) filter.busId = query.busId;
  if (query.status) filter.status = query.status;

  const [total, bookings] = await Promise.all([
    Booking.countDocuments(filter),
    Booking.find(filter)
      .sort({ travelDate: -1, createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
  ]);
  const contexts = await loadBusContexts([...new Set(bookings.map((b) => b.busId))]);
  const names = await userNames(bookings.map((b) => b.userId));
  return {
    bookings: bookings.map((b) => toBookingView(b, contextFor(contexts, b.busId), names.get(String(b.userId)))),
    page: query.page,
    limit: query.limit,
    total,
  };
}
