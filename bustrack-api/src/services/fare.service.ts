import { Types } from "mongoose";
import { Bus } from "../models/Bus";
import { Route, type RouteLean } from "../models/Route";
import { HttpError } from "../utils/httpError";
import { runInTransaction } from "../utils/transaction";
import { findDriverBus, sortedFares } from "./bus.service";
import type { FaresInput } from "../validators/schemas";

const NO_BUS = "No bus is assigned to this driver. Contact your administrator.";
const NO_ROUTE = "Your assigned bus does not have a route with stops yet.";

export async function getDriverFares(driverId: string) {
  const bus = await findDriverBus(driverId);
  if (!bus) throw new HttpError(409, NO_BUS);
  const route = bus.routeId ? await Route.findById(bus.routeId).lean<RouteLean>() : null;
  if (!route) throw new HttpError(409, NO_ROUTE);
  return {
    bus: { busId: bus._id, label: bus.label, routeName: route.name },
    stops: route.stops,
    fares: sortedFares(bus),
  };
}

/** Replaces the whole fare table for the driver's bus, atomically. */
export async function replaceDriverFares(driverId: string, fares: FaresInput["fares"], actorId: string) {
  return runInTransaction(async (session) => {
    const bus = await findDriverBus(driverId, session);
    if (!bus) throw new HttpError(409, NO_BUS);
    const route = bus.routeId
      ? await Route.findById(bus.routeId).session(session).lean<RouteLean>()
      : null;
    if (!route) throw new HttpError(409, NO_ROUTE);

    const seen = new Set<string>();
    for (const fare of fares) {
      const key = `${fare.fromStopIndex}:${fare.toStopIndex}`;
      if (fare.fromStopIndex >= fare.toStopIndex || fare.toStopIndex >= route.stops.length || seen.has(key)) {
        throw new HttpError(400, "Each fare must use a unique pair of valid route stops.");
      }
      seen.add(key);
    }

    const updatedBy = new Types.ObjectId(actorId);
    const updatedAt = new Date();
    await Bus.updateOne(
      { _id: bus._id },
      {
        $set: {
          fares: fares.map((fare) => ({
            fromStopIndex: fare.fromStopIndex,
            toStopIndex: fare.toStopIndex,
            amount: fare.amount,
            updatedBy,
            updatedAt,
          })),
        },
      },
      { session },
    );
    return { busId: bus._id, faresSaved: fares.length };
  });
}
