import { Bus } from "../models/Bus";
import { Route } from "../models/Route";
import { HttpError } from "../utils/httpError";
import { assertObjectId } from "../utils/ids";
import type { RouteCreateInput, RouteUpdateInput } from "../validators/schemas";

export async function listRoutes() {
  return Route.find().sort({ name: 1 });
}

export async function getRoute(routeId: string) {
  assertObjectId(routeId, "Route not found.");
  const route = await Route.findById(routeId);
  if (!route) throw new HttpError(404, "Route not found.");
  return route;
}

export async function createRoute(input: RouteCreateInput) {
  return Route.create(input);
}

export async function updateRoute(routeId: string, patch: RouteUpdateInput) {
  const route = await getRoute(routeId);
  if (patch.stops) {
    // Fare pairs are stop indexes, so changing the stop list invalidates them.
    await Bus.updateMany({ routeId: route._id }, { $set: { fares: [], bookingsEnabled: false } });
  }
  route.set(patch);
  await route.save();
  return route;
}

export async function deleteRoute(routeId: string): Promise<void> {
  const route = await getRoute(routeId);
  if (await Bus.exists({ routeId: route._id })) {
    throw new HttpError(409, "Reassign or remove the buses on this route before deleting it.");
  }
  await route.deleteOne();
}
