import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { Types } from "mongoose";
import { LIMITS } from "../constants";
import { Bus } from "../models/Bus";
import { DriverAccessRequest } from "../models/DriverAccessRequest";
import { Route, type RouteLean } from "../models/Route";
import { User } from "../models/User";
import { HttpError } from "../utils/httpError";
import { assertObjectId } from "../utils/ids";
import { runInTransaction } from "../utils/transaction";
import {
  documentExists,
  driverDocumentStorageAvailable,
  getPrivateDriverDocumentPath,
  removeDriverDocumentFiles,
} from "./driverDocumentStorage";
import type { DriverAccessInput } from "../validators/schemas";

const STATUS_ORDER: Record<string, number> = { pending: 0, approved: 1, rejected: 2 };

export async function submitAccessRequest(
  input: DriverAccessInput,
  files: { drivingLicenseFile: string; aadhaarCardFile: string },
) {
  let requestedRouteId: Types.ObjectId | null = null;
  let selectedStopIndexes: number[] = [];
  if (input.routeId) {
    const route = await Route.findById(input.routeId).lean<RouteLean>();
    if (!route) {
      throw new HttpError(404, "That route is no longer available. Refresh the route list and try again.");
    }
    if ((input.stopIndexes ?? []).some((index) => index >= route.stops.length)) {
      throw new HttpError(400, "One or more selected stops are no longer on this route. Refresh and try again.");
    }
    requestedRouteId = route._id;
    selectedStopIndexes = [...(input.stopIndexes ?? [])].sort((a, b) => a - b);
  }
  if (await User.exists({ email: input.email })) {
    throw new HttpError(409, "An account already uses this email. Contact your administrator if you need access.");
  }

  const existing = await DriverAccessRequest.findOne({ email: input.email });
  if (existing?.status === "pending") {
    throw new HttpError(409, "An access request for this email is already awaiting review.");
  }
  const previousFiles = [existing?.drivingLicensePath, existing?.aadhaarCardPath];

  const request = await DriverAccessRequest.findOneAndUpdate(
    { email: input.email },
    {
      $set: {
        name: input.name,
        phone: input.phone,
        reason: input.reason,
        requestedRouteId,
        selectedStopIndexes,
        customStops: input.customStops ?? [],
        customRouteName: input.customRouteName ?? null,
        drivingLicensePath: files.drivingLicenseFile,
        aadhaarCardPath: files.aadhaarCardFile,
        status: "pending",
        submittedAt: new Date(),
        reviewedAt: null,
        reviewedBy: null,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  // Old documents are removed only after the new request is saved.
  await removeDriverDocumentFiles(previousFiles);
  return { requestId: String(request?._id), status: "pending" as const };
}

export async function listAccessRequests() {
  const rows = await DriverAccessRequest.find().sort({ submittedAt: -1 }).limit(100);
  const routeIds = rows.map((r) => r.requestedRouteId).filter((id): id is Types.ObjectId => Boolean(id));
  const routes = await Route.find({ _id: { $in: routeIds } }).lean<RouteLean[]>();
  const routeById = new Map(routes.map((route): [string, RouteLean] => [String(route._id), route]));

  const requests = rows.map((row) => {
    const route = row.requestedRouteId ? routeById.get(String(row.requestedRouteId)) : undefined;
    return {
      id: String(row._id),
      name: row.name,
      email: row.email,
      phone: row.phone,
      reason: row.reason,
      status: row.status,
      createdAt: row.submittedAt,
      requestedRoute: route ? { id: String(route._id), name: route.name, code: route.code } : null,
      customRoute: row.customStops.length
        ? { name: row.customRouteName, stops: row.customStops }
        : null,
      selectedStops: row.selectedStopIndexes.map((index) => ({
        index,
        name: route?.stops[index]?.name ?? `Stop ${index + 1}`,
      })),
      hasDrivingLicense: Boolean(row.drivingLicensePath),
      hasAadhaarCard: Boolean(row.aadhaarCardPath),
    };
  });
  return requests.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
}

export async function getDocumentPath(requestId: string, type: "driving-license" | "aadhaar-card"): Promise<string> {
  if (!driverDocumentStorageAvailable) {
    throw new HttpError(503, "Private driver-document storage is not configured for this serverless deployment.");
  }
  assertObjectId(requestId, "Document not found.");
  const request = await DriverAccessRequest.findById(requestId);
  const filename = type === "driving-license" ? request?.drivingLicensePath : request?.aadhaarCardPath;
  if (!request || request.status !== "pending" || !filename) throw new HttpError(404, "Document not found.");
  if (!documentExists(filename)) throw new HttpError(404, "Document is no longer available.");
  const path = getPrivateDriverDocumentPath(filename);
  if (!path) throw new HttpError(404, "Document not found.");
  return path;
}

export async function approveAccessRequest(
  requestId: string,
  adminId: string,
  input: { password: string; busId: string },
) {
  assertObjectId(requestId, "Access request not found.");
  const passwordHash = await bcrypt.hash(input.password, LIMITS.bcryptRounds);

  const result = await runInTransaction(async (session) => {
    const request = await DriverAccessRequest.findById(requestId).session(session);
    if (!request) throw new HttpError(404, "Access request not found.");
    if (request.status !== "pending") throw new HttpError(409, "This access request has already been reviewed.");
    if (await User.exists({ email: request.email }).session(session)) {
      throw new HttpError(409, "This email already belongs to an account. Resolve the existing account before approving.");
    }

    const bus = await Bus.findById(input.busId).session(session);
    if (!bus) throw new HttpError(404, "Selected bus was not found. Refresh the fleet and try again.");
    if (bus.status === "blocked") {
      throw new HttpError(409, "Selected bus is blocked. Choose an active or offline bus instead.");
    }
    const isCustom = request.customStops.length >= 2;
    if (!isCustom && request.requestedRouteId && String(request.requestedRouteId) !== String(bus.routeId)) {
      throw new HttpError(409, "Assign a bus on the route requested by this driver.");
    }
    if (bus.driverId) throw new HttpError(409, "Selected bus is already assigned. Choose another available bus.");

    // A custom route drawn by the driver becomes a real route, and the bus is moved onto it.
    let customRouteId: Types.ObjectId | null = null;
    if (isCustom) {
      const code = `CUST-${randomBytes(3).toString("hex").toUpperCase()}`;
      const stops = request.customStops.map((stop) => ({ name: stop.name, lat: stop.lat, lon: stop.lon }));
      const [created] = await Route.create(
        [
          {
            name: request.customRouteName ?? `${stops[0].name} to ${stops[stops.length - 1].name}`,
            code,
            origin: stops[0].name,
            destination: stops[stops.length - 1].name,
            color: "#7C3AED",
            stops,
          },
        ],
        { session },
      );
      customRouteId = created._id;
    }

    const [driver] = await User.create(
      [
        {
          name: request.name,
          email: request.email,
          passwordHash,
          role: "driver",
          driverStatus: "approved",
        },
      ],
      { session },
    );
    const busUpdate: Record<string, unknown> = { driverId: driver._id };
    if (customRouteId) {
      busUpdate.routeId = customRouteId;
      busUpdate.fares = [];
      busUpdate.bookingsEnabled = false;
    }
    const assigned = await Bus.updateOne({ _id: bus._id, driverId: null }, { $set: busUpdate }, { session });
    if (!assigned.modifiedCount) throw new HttpError(409, "Selected bus is already assigned. Choose another available bus.");

    const filesToRemove = [request.drivingLicensePath, request.aadhaarCardPath];
    request.status = "approved";
    request.reviewedAt = new Date();
    request.reviewedBy = new Types.ObjectId(adminId);
    request.drivingLicensePath = null;
    request.aadhaarCardPath = null;
    await request.save({ session });

    return {
      driver: { id: String(driver._id), name: driver.name, email: driver.email, busId: bus._id },
      filesToRemove,
    };
  });

  await removeDriverDocumentFiles(result.filesToRemove);
  return { driver: result.driver };
}

export async function rejectAccessRequest(requestId: string, adminId: string) {
  assertObjectId(requestId, "Access request not found.");
  const files = await runInTransaction(async (session) => {
    const request = await DriverAccessRequest.findById(requestId).session(session);
    if (!request) throw new HttpError(404, "Access request not found.");
    if (request.status !== "pending") throw new HttpError(409, "This access request has already been reviewed.");

    const filesToRemove = [request.drivingLicensePath, request.aadhaarCardPath];
    request.status = "rejected";
    request.reviewedAt = new Date();
    request.reviewedBy = new Types.ObjectId(adminId);
    request.drivingLicensePath = null;
    request.aadhaarCardPath = null;
    await request.save({ session });
    return filesToRemove;
  });
  await removeDriverDocumentFiles(files);
  return { requestId, status: "rejected" as const };
}
