import type { Request, Response } from "express";
import { routeParam } from "../utils/params";
import { HttpError } from "../utils/httpError";
import { ok } from "../utils/respond";
import { parseOrThrow } from "../utils/validate";
import * as analytics from "../services/analytics.service";
import * as access from "../services/driverAccess.service";
import * as booking from "../services/booking.service";
import * as bus from "../services/bus.service";
import * as drivers from "../services/driver.service";
import * as route from "../services/route.service";
import * as user from "../services/user.service";
import {
  analyticsQuerySchema,
  approveAccessSchema,
  assignmentSchema,
  bookingsQuerySchema,
  busCreateSchema,
  busRouteSchema,
  busStatusSchema,
  busUpdateSchema,
  driverCreateSchema,
  driverStatusSchema,
  driverUpdateSchema,
  routeCreateSchema,
  routeUpdateSchema,
  usersQuerySchema,
} from "../validators/schemas";

// ---------- overview ----------
export async function overview(_req: Request, res: Response): Promise<void> {
  ok(res, await analytics.getOverview());
}

export async function getAnalytics(req: Request, res: Response): Promise<void> {
  const query = parseOrThrow(analyticsQuerySchema, req.query, "Choose a 7 or 30 day analytics range.");
  ok(res, await analytics.getAnalytics(Number(query.days) as 7 | 30));
}

export async function activity(_req: Request, res: Response): Promise<void> {
  ok(res, { events: await analytics.getActivity() });
}

export async function fleet(_req: Request, res: Response): Promise<void> {
  ok(res, await bus.getFleet());
}

// ---------- routes ----------
export async function listRoutes(_req: Request, res: Response): Promise<void> {
  ok(res, { routes: await route.listRoutes() });
}

export async function getRoute(req: Request, res: Response): Promise<void> {
  ok(res, { route: await route.getRoute(routeParam(req, "routeId")) });
}

export async function createRoute(req: Request, res: Response): Promise<void> {
  const input = parseOrThrow(routeCreateSchema, req.body, "Enter a route name, unique code, endpoints, and 2 to 50 stops.");
  ok(res, { route: await route.createRoute(input) }, 201);
}

export async function updateRoute(req: Request, res: Response): Promise<void> {
  const patch = parseOrThrow(routeUpdateSchema, req.body, "Provide valid route fields to update.");
  ok(res, { route: await route.updateRoute(routeParam(req, "routeId"), patch) });
}

export async function deleteRoute(req: Request, res: Response): Promise<void> {
  await route.deleteRoute(routeParam(req, "routeId"));
  ok(res, { routeId: routeParam(req, "routeId"), deleted: true });
}

// ---------- buses ----------
export async function getBus(req: Request, res: Response): Promise<void> {
  ok(res, { bus: await bus.getBusDetail(routeParam(req, "busId")) });
}

export async function createBus(req: Request, res: Response): Promise<void> {
  const input = parseOrThrow(busCreateSchema, req.body, "Valid busId and label required");
  const created = await bus.createBus(input);
  ok(res, { busId: created._id }, 201);
}

export async function updateBus(req: Request, res: Response): Promise<void> {
  const patch = parseOrThrow(busUpdateSchema, req.body, "Provide a valid label, capacity, or route to update.");
  const updated = await bus.updateBus(routeParam(req, "busId"), patch);
  ok(res, { busId: updated._id });
}

export async function setBusStatus(req: Request, res: Response): Promise<void> {
  const input = parseOrThrow(busStatusSchema, req.body, "Invalid status");
  await bus.setBusStatus(routeParam(req, "busId"), input.status);
  ok(res, { busId: routeParam(req, "busId"), status: input.status });
}

export async function setBusRoute(req: Request, res: Response): Promise<void> {
  const input = parseOrThrow(busRouteSchema, req.body, "routeId must be a route id or null to unassign.");
  await bus.updateBus(routeParam(req, "busId"), { routeId: input.routeId });
  ok(res, { busId: routeParam(req, "busId"), routeId: input.routeId });
}

export async function deleteBus(req: Request, res: Response): Promise<void> {
  await bus.deleteBus(routeParam(req, "busId"));
  ok(res, { busId: routeParam(req, "busId"), deleted: true });
}

// ---------- drivers ----------
export async function listDrivers(_req: Request, res: Response): Promise<void> {
  ok(res, { drivers: await drivers.listDrivers() });
}

export async function listDriverReview(_req: Request, res: Response): Promise<void> {
  ok(res, { drivers: await drivers.listDriverReview() });
}

export async function createDriver(req: Request, res: Response): Promise<void> {
  const input = parseOrThrow(driverCreateSchema, req.body, "Name, valid email and password (8+ characters) required");
  ok(res, { driver: await drivers.createDriver(input) }, 201);
}

export async function updateDriver(req: Request, res: Response): Promise<void> {
  const input = parseOrThrow(driverUpdateSchema, req.body, "Enter a name between 2 and 100 characters.");
  ok(res, { driver: await drivers.updateDriver(routeParam(req, "driverId"), input.name) });
}

export async function assignDriver(req: Request, res: Response): Promise<void> {
  const input = parseOrThrow(assignmentSchema, req.body, "Choose a valid bus or null to unassign.");
  ok(res, await drivers.assignDriver(routeParam(req, "driverId"), input.busId));
}

export async function setDriverStatus(req: Request, res: Response): Promise<void> {
  const input = parseOrThrow(driverStatusSchema, req.body, "Choose approved or suspended status.");
  ok(res, await drivers.setDriverStatus(routeParam(req, "driverId"), input.status));
}

export async function deleteDriver(req: Request, res: Response): Promise<void> {
  await drivers.deleteDriver(routeParam(req, "driverId"));
  ok(res, { driverId: routeParam(req, "driverId"), deleted: true });
}

// ---------- users & bookings ----------
export async function listUsers(req: Request, res: Response): Promise<void> {
  const query = parseOrThrow(usersQuerySchema, req.query, "Invalid user filters.");
  ok(res, await user.listUsers(query));
}

export async function listBookings(req: Request, res: Response): Promise<void> {
  const query = parseOrThrow(bookingsQuerySchema, req.query, "Invalid booking filters.");
  ok(res, await booking.listAllBookings(query));
}

// ---------- driver access requests ----------
export async function listAccessRequests(_req: Request, res: Response): Promise<void> {
  ok(res, { requests: await access.listAccessRequests() });
}

export async function getAccessDocument(req: Request, res: Response): Promise<void> {
  const type = routeParam(req, "documentType");
  if (type !== "driving-license" && type !== "aadhaar-card") {
    throw new HttpError(404, "Document not found.");
  }
  const path = await access.getDocumentPath(routeParam(req, "requestId"), type);
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
  res.sendFile(path);
}

export async function approveAccessRequest(req: Request, res: Response): Promise<void> {
  const input = parseOrThrow(approveAccessSchema, req.body, "Set an initial password (8-72 characters) and assign an available bus.");
  ok(res, await access.approveAccessRequest(routeParam(req, "requestId"), req.user!.id, input), 201);
}

export async function rejectAccessRequest(req: Request, res: Response): Promise<void> {
  ok(res, await access.rejectAccessRequest(routeParam(req, "requestId"), req.user!.id));
}
