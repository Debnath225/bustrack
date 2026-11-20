import type { Request, Response } from "express";
import { ok } from "../utils/respond";
import { parseOrThrow } from "../utils/validate";
import * as auth from "../services/auth.service";
import * as booking from "../services/booking.service";
import * as bus from "../services/bus.service";
import * as route from "../services/route.service";
import * as user from "../services/user.service";
import {
  availabilityQuerySchema,
  createBookingSchema,
  nearbyQuerySchema,
  notificationPreferencesSchema,
  profileSchema,
} from "../validators/schemas";

export async function listRoutes(_req: Request, res: Response): Promise<void> {
  ok(res, { routes: await route.listRoutes() });
}

export async function getRoute(req: Request, res: Response): Promise<void> {
  ok(res, { route: await route.getRoute(req.params.routeId) });
}

export async function listBuses(_req: Request, res: Response): Promise<void> {
  ok(res, { buses: await bus.listPublicBuses() });
}

export async function getBus(req: Request, res: Response): Promise<void> {
  ok(res, { bus: await bus.getBusDetail(req.params.busId) });
}

export async function getBusHistory(req: Request, res: Response): Promise<void> {
  ok(res, { points: await bus.getBusHistory(req.params.busId) });
}

export async function getAvailability(req: Request, res: Response): Promise<void> {
  const query = parseOrThrow(availabilityQuerySchema, req.query, "Choose two stops on this route.");
  ok(res, await booking.getAvailability(req.params.busId, query.fromStopIndex, query.toStopIndex));
}

export async function getNearby(req: Request, res: Response): Promise<void> {
  const query = parseOrThrow(nearbyQuerySchema, req.query, "Valid lat and lon are required");
  ok(res, { buses: await bus.getNearbyBuses(query.lat, query.lon, query.radius) });
}

export async function getMe(req: Request, res: Response): Promise<void> {
  ok(res, await auth.getMe(req.user!.id));
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  const input = parseOrThrow(profileSchema, req.body, "Enter a name between 2 and 100 characters.");
  ok(res, { user: await user.updateProfile(req.user!.id, input.name) });
}

export async function listFavorites(req: Request, res: Response): Promise<void> {
  ok(res, { favorites: await user.listFavorites(req.user!.id) });
}

export async function addFavorite(req: Request, res: Response): Promise<void> {
  await user.addFavorite(req.user!.id, req.params.busId);
  ok(res, { busId: req.params.busId });
}

export async function removeFavorite(req: Request, res: Response): Promise<void> {
  await user.removeFavorite(req.user!.id, req.params.busId);
  ok(res, { busId: req.params.busId });
}

export async function getPreferences(req: Request, res: Response): Promise<void> {
  ok(res, { preferences: await user.getNotificationPreferences(req.user!.id) });
}

export async function updatePreferences(req: Request, res: Response): Promise<void> {
  const patch = parseOrThrow(notificationPreferencesSchema, req.body, "Choose valid notification preferences.");
  ok(res, { preferences: await user.updateNotificationPreferences(req.user!.id, patch) });
}

export async function listBookings(req: Request, res: Response): Promise<void> {
  ok(res, await booking.listPassengerBookings(req.user!.id));
}

export async function getBooking(req: Request, res: Response): Promise<void> {
  ok(res, await booking.getPassengerBooking(req.user!.id, req.params.bookingId));
}

export async function createBooking(req: Request, res: Response): Promise<void> {
  const input = parseOrThrow(createBookingSchema, req.body, "Choose a bus, two different stops, and 1–6 seats.");
  ok(res, await booking.createBooking(req.user!.id, input), 201);
}

export async function cancelBooking(req: Request, res: Response): Promise<void> {
  await booking.cancelBooking(req.user!.id, req.params.bookingId);
  ok(res, { bookingId: req.params.bookingId, status: "cancelled" });
}
