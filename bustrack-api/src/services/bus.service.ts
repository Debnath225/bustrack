import { Types, type HydratedDocument } from "mongoose";
import { env } from "../config/env";
import { LIMITS } from "../constants";
import { Booking } from "../models/Booking";
import { Bus, type IBus } from "../models/Bus";
import { LocationPing } from "../models/LocationPing";
import { Route, type RouteLean } from "../models/Route";
import { User } from "../models/User";
import { HttpError } from "../utils/httpError";
import { distanceMeters } from "../utils/geo";
import { runInTransaction } from "../utils/transaction";
import { isBusLive } from "./booking.rules";

type BusDoc = HydratedDocument<IBus>;

export function busIsLive(bus: Pick<IBus, "status" | "lastSeen">): boolean {
  return isBusLive(bus.status, bus.lastSeen, env.LOCATION_STALE_SECONDS);
}

function locationView(bus: IBus) {
  const loc = bus.lastLocation;
  return {
    lat: loc?.lat ?? null,
    lon: loc?.lon ?? null,
    speed: loc?.speed ?? 0,
    bearing: loc?.bearing ?? 0,
    accuracy: loc?.accuracy ?? null,
    recordedAt: loc?.recordedAt ?? null,
    source: loc?.source ?? null,
  };
}

export function sortedFares(bus: IBus) {
  return [...bus.fares]
    .sort((a, b) => a.fromStopIndex - b.fromStopIndex || a.toStopIndex - b.toStopIndex)
    .map((fare) => ({
      fromStopIndex: fare.fromStopIndex,
      toStopIndex: fare.toStopIndex,
      amount: fare.amount,
      updatedAt: fare.updatedAt,
    }));
}

export async function routesById(ids: Array<Types.ObjectId | null | undefined>): Promise<Map<string, RouteLean>> {
  const unique = ids.filter((id): id is Types.ObjectId => Boolean(id));
  const routes = await Route.find({ _id: { $in: unique } }).lean<RouteLean[]>();
  return new Map(routes.map((route): [string, RouteLean] => [String(route._id), route]));
}

function routeSummary(route: RouteLean | undefined) {
  return route
    ? { id: String(route._id), name: route.name, code: route.code, origin: route.origin, destination: route.destination }
    : null;
}

export async function findBusOrThrow(busId: string): Promise<BusDoc> {
  const bus = await Bus.findById(busId);
  if (!bus) throw new HttpError(404, "Bus not found.");
  return bus;
}

export async function findDriverBus(driverId: string, session?: import("mongoose").ClientSession) {
  return Bus.findOne({ driverId: new Types.ObjectId(driverId) }).session(session ?? null);
}

// ---------- public / passenger ----------

export async function listPublicBuses() {
  const buses = await Bus.find({ status: { $ne: "blocked" } }).sort({ label: 1 });
  const routes = await routesById(buses.map((bus) => bus.routeId));
  return buses.map((bus) => ({
    busId: bus._id,
    label: bus.label,
    routeId: bus.routeId ? String(bus.routeId) : null,
    capacity: bus.capacity,
    status: bus.status,
    lastSeen: bus.lastSeen,
    isLive: busIsLive(bus),
    ...locationView(bus),
    route: routeSummary(bus.routeId ? routes.get(String(bus.routeId)) : undefined),
  }));
}

export async function getBusDetail(busId: string) {
  const bus = await findBusOrThrow(busId);
  if (bus.status === "blocked") throw new HttpError(404, "Bus not found.");
  const route = bus.routeId ? (await routesById([bus.routeId])).get(String(bus.routeId)) : undefined;
  return {
    busId: bus._id,
    label: bus.label,
    routeId: bus.routeId ? String(bus.routeId) : null,
    routeName: route?.name ?? null,
    routeCode: route?.code ?? null,
    stops: route?.stops ?? [],
    capacity: bus.capacity,
    status: bus.status,
    lastSeen: bus.lastSeen,
    isLive: busIsLive(bus),
    bookingsEnabled: bus.bookingsEnabled,
    fares: sortedFares(bus),
    location: bus.lastLocation ? locationView(bus) : null,
  };
}

export async function getBusHistory(busId: string) {
  await findBusOrThrow(busId);
  const since = new Date(Date.now() - LIMITS.historyWindowHours * 3600 * 1000);
  const pings = await LocationPing.find({ busId, recordedAt: { $gte: since } })
    .sort({ recordedAt: -1 })
    .limit(LIMITS.historyMaxPoints)
    .lean();
  return pings
    .reverse()
    .map((p) => ({ lat: p.lat, lon: p.lon, speed: p.speed, bearing: p.bearing, recordedAt: p.recordedAt }));
}

export async function getNearbyBuses(lat: number, lon: number, radius: number) {
  const buses = await Bus.find({ status: { $ne: "blocked" }, lastLocation: { $ne: null } });
  return buses
    .map((bus) => {
      const loc = bus.lastLocation!;
      const distance = distanceMeters({ lat, lon }, { lat: loc.lat, lon: loc.lon });
      return { busId: bus._id, label: bus.label, isLive: busIsLive(bus), ...locationView(bus), distanceMeters: Math.round(distance) };
    })
    .filter((bus) => bus.distanceMeters <= radius)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}

// ---------- admin ----------

async function assertRouteExists(routeId: string): Promise<Types.ObjectId> {
  const id = new Types.ObjectId(routeId);
  if (!(await Route.exists({ _id: id }))) throw new HttpError(404, "Route not found.");
  return id;
}

/** Changing a bus's route invalidates its fares and bookings, so those are reset. */
async function applyRoute(bus: BusDoc, routeId: string | null): Promise<void> {
  const next = routeId ? await assertRouteExists(routeId) : null;
  if (String(bus.routeId) === String(next)) return;
  bus.routeId = next;
  bus.fares = [];
  bus.bookingsEnabled = false;
}

export async function createBus(input: { busId: string; label: string; routeId?: string | null; capacity?: number }) {
  const routeId = input.routeId ? await assertRouteExists(input.routeId) : null;
  return Bus.create({
    _id: input.busId,
    label: input.label,
    routeId,
    capacity: input.capacity ?? LIMITS.defaultBusCapacity,
    status: "offline",
  });
}

export async function updateBus(
  busId: string,
  patch: { label?: string; capacity?: number; routeId?: string | null },
) {
  const bus = await findBusOrThrow(busId);
  if (patch.routeId !== undefined) await applyRoute(bus, patch.routeId);
  if (patch.label !== undefined) bus.label = patch.label;
  if (patch.capacity !== undefined) bus.capacity = patch.capacity;
  await bus.save();
  return bus;
}

export async function setBusStatus(busId: string, status: IBus["status"]) {
  const bus = await findBusOrThrow(busId);
  bus.status = status;
  if (status === "blocked") bus.bookingsEnabled = false;
  await bus.save();
  return bus;
}

export async function deleteBus(busId: string): Promise<void> {
  if (await Booking.exists({ busId, status: "confirmed" })) {
    throw new HttpError(409, "This bus has confirmed bookings. Cancel or board them before deleting.");
  }
  await runInTransaction(async (session) => {
    const result = await Bus.deleteOne({ _id: busId }, { session });
    if (!result.deletedCount) throw new HttpError(404, "Bus not found.");
    await LocationPing.deleteMany({ busId }, { session });
  });
}

export async function getFleet() {
  const buses = await Bus.find().sort({ _id: 1 });
  const routes = await routesById(buses.map((bus) => bus.routeId));
  const driverIds = buses.map((bus) => bus.driverId).filter((id): id is Types.ObjectId => Boolean(id));
  const drivers = await User.find({ _id: { $in: driverIds } })
    .select("name")
    .lean<Array<{ _id: Types.ObjectId; name: string }>>();
  const driverNames = new Map(drivers.map((d): [string, string] => [String(d._id), d.name]));

  const routeList = await Route.find().sort({ name: 1 }).lean<RouteLean[]>();
  return {
    // snake_case keys are what the existing mobile screens read.
    buses: buses.map((bus) => ({
      bus_id: bus._id,
      label: bus.label,
      capacity: bus.capacity,
      status: bus.status,
      last_seen: bus.lastSeen,
      is_live: busIsLive(bus),
      route_id: bus.routeId ? String(bus.routeId) : null,
      route_name: bus.routeId ? routes.get(String(bus.routeId))?.name ?? null : null,
      driver_id: bus.driverId ? String(bus.driverId) : null,
      driver_name: bus.driverId ? driverNames.get(String(bus.driverId)) ?? null : null,
    })),
    routes: routeList.map((route) => routeSummary(route)),
  };
}
