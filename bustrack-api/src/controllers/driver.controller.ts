import type { Request, Response } from "express";
import { ok } from "../utils/respond";
import { parseOrThrow } from "../utils/validate";
import * as auth from "../services/auth.service";
import * as booking from "../services/booking.service";
import * as fare from "../services/fare.service";
import { recordLocation } from "../services/location.service";
import { bookingSettingsSchema, faresSchema, locationSchema } from "../validators/schemas";
import { findDriverBus } from "../services/bus.service";
import { HttpError } from "../utils/httpError";

export async function me(req: Request, res: Response): Promise<void> {
  const result = await auth.getMe(req.user!.id);
  const user = result.user as { id: string; name: string; email: string };
  ok(res, {
    ...result,
    // `driver` is kept for older app builds.
    driver: result.assignment ? { id: user.id, name: user.name, email: user.email, ...result.assignment } : null,
  });
}

export async function postLocation(req: Request, res: Response): Promise<void> {
  const input = parseOrThrow(locationSchema, req.body, "Invalid GPS coordinates");
  const bus = await findDriverBus(req.user!.id);
  if (!bus) throw new HttpError(409, "No bus is assigned to this driver. Contact your administrator.");
  if (bus.status === "blocked") throw new HttpError(403, "This bus is blocked. Contact your administrator.");
  await recordLocation(bus._id, { ...input, source: "DRIVER_PHONE" });
  ok(res, { busId: bus._id, receivedAt: new Date().toISOString() }, 202);
}

export async function getFares(req: Request, res: Response): Promise<void> {
  ok(res, await fare.getDriverFares(req.user!.id));
}

export async function saveFares(req: Request, res: Response): Promise<void> {
  const input = parseOrThrow(faresSchema, req.body, "Enter valid positive fares with no more than two decimal places.");
  ok(res, await fare.replaceDriverFares(req.user!.id, input.fares, req.user!.id));
}

export async function getBookingSettings(req: Request, res: Response): Promise<void> {
  ok(res, await booking.getDriverBookingSettings(req.user!.id));
}

export async function setBookingSettings(req: Request, res: Response): Promise<void> {
  const input = parseOrThrow(bookingSettingsSchema, req.body, "Choose whether to accept passenger bookings.");
  ok(res, await booking.setDriverBookingEnabled(req.user!.id, input.enabled));
}

export async function listBookings(req: Request, res: Response): Promise<void> {
  ok(res, await booking.getDriverBookings(req.user!.id));
}

export async function boardBooking(req: Request, res: Response): Promise<void> {
  await booking.markBoarded(req.user!.id, req.params.bookingId);
  ok(res, { bookingId: req.params.bookingId, status: "boarded" });
}

export async function markNoShow(req: Request, res: Response): Promise<void> {
  await booking.markNoShow(req.user!.id, req.params.bookingId);
  ok(res, { bookingId: req.params.bookingId, status: "no_show" });
}
