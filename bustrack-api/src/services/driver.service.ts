import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import { LIMITS, type DriverStatus } from "../constants";
import { Bus } from "../models/Bus";
import { User } from "../models/User";
import { HttpError } from "../utils/httpError";
import { assertObjectId } from "../utils/ids";
import { runInTransaction } from "../utils/transaction";

const STATUS_ORDER: Record<DriverStatus, number> = { pending: 0, approved: 1, suspended: 2 };

async function driverRows() {
  const drivers = await User.find({ role: "driver" })
    .sort({ name: 1 })
    .lean<Array<{ _id: Types.ObjectId; name: string; email: string; driverStatus?: DriverStatus }>>();
  const buses = await Bus.find({ driverId: { $ne: null } })
    .select("label driverId")
    .lean<Array<{ _id: string; label: string; driverId: Types.ObjectId }>>();
  const busByDriver = new Map(
    buses.map((bus): [string, { busId: string; label: string }] => [
      String(bus.driverId),
      { busId: bus._id, label: bus.label },
    ]),
  );
  return drivers.map((driver) => {
    const bus = busByDriver.get(String(driver._id));
    return {
      id: String(driver._id),
      name: driver.name,
      email: driver.email,
      driverStatus: driver.driverStatus ?? "pending",
      busId: bus?.busId ?? null,
      busLabel: bus?.label ?? null,
    };
  });
}

export async function listDrivers() {
  return driverRows();
}

/** Drivers sorted so pending accounts come first, which is what the review screen needs. */
export async function listDriverReview() {
  const rows = await driverRows();
  return rows.sort(
    (a, b) => STATUS_ORDER[a.driverStatus as DriverStatus] - STATUS_ORDER[b.driverStatus as DriverStatus] ||
      a.name.localeCompare(b.name),
  );
}

export async function createDriver(input: { name: string; email: string; password: string; busId?: string | null }) {
  if (await User.exists({ email: input.email })) throw new HttpError(409, "Email already exists");
  if (input.busId) {
    const bus = await Bus.findById(input.busId);
    if (!bus) throw new HttpError(404, "Bus not found.");
    if (bus.driverId) throw new HttpError(409, "That bus already has a driver.");
  }
  const passwordHash = await bcrypt.hash(input.password, LIMITS.bcryptRounds);

  return runInTransaction(async (session) => {
    const [driver] = await User.create(
      [{ name: input.name, email: input.email, passwordHash, role: "driver", driverStatus: "pending" }],
      { session },
    );
    if (input.busId) {
      const assigned = await Bus.updateOne(
        { _id: input.busId, driverId: null },
        { $set: { driverId: driver._id } },
        { session },
      );
      if (!assigned.modifiedCount) throw new HttpError(409, "That bus already has a driver.");
    }
    return { id: String(driver._id), name: driver.name, email: driver.email, busId: input.busId ?? null };
  });
}

export async function updateDriver(driverId: string, name: string) {
  assertObjectId(driverId, "Driver not found.");
  const driver = await User.findOneAndUpdate({ _id: driverId, role: "driver" }, { $set: { name } }, { new: true });
  if (!driver) throw new HttpError(404, "Driver not found.");
  return { id: String(driver._id), name: driver.name, email: driver.email };
}

export async function assignDriver(driverId: string, busId: string | null) {
  assertObjectId(driverId, "Driver not found.");
  return runInTransaction(async (session) => {
    const driver = await User.findOne({ _id: driverId, role: "driver" }).session(session);
    if (!driver) throw new HttpError(404, "Driver not found.");

    if (busId) {
      const bus = await Bus.findById(busId).session(session);
      if (!bus) throw new HttpError(404, "Bus not found.");
      if (bus.driverId && String(bus.driverId) !== String(driver._id)) {
        throw new HttpError(409, "That bus is assigned to another driver. Unassign it first.");
      }
    }

    await Bus.updateMany({ driverId: driver._id }, { $set: { driverId: null } }, { session });
    if (busId) await Bus.updateOne({ _id: busId }, { $set: { driverId: driver._id } }, { session });
    return { driverId, busId };
  });
}

export async function setDriverStatus(driverId: string, status: "approved" | "suspended") {
  assertObjectId(driverId, "Driver not found.");
  if (status === "approved" && !(await Bus.exists({ driverId: new Types.ObjectId(driverId) }))) {
    throw new HttpError(409, "Assign a bus to this driver before approving sign-in.");
  }
  const result = await User.updateOne({ _id: driverId, role: "driver" }, { $set: { driverStatus: status } });
  if (!result.matchedCount) throw new HttpError(404, "Driver not found.");
  return { driverId, driverStatus: status };
}

export async function deleteDriver(driverId: string): Promise<void> {
  assertObjectId(driverId, "Driver not found.");
  await runInTransaction(async (session) => {
    await Bus.updateMany({ driverId: new Types.ObjectId(driverId) }, { $set: { driverId: null } }, { session });
    const result = await User.deleteOne({ _id: driverId, role: "driver" }, { session });
    if (!result.deletedCount) throw new HttpError(404, "Driver not found.");
  });
}
