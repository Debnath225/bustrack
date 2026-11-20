import bcrypt from "bcryptjs";
import { createToken } from "../config/jwt";
import { LIMITS, type UserRole } from "../constants";
import { Bus } from "../models/Bus";
import { Route } from "../models/Route";
import { User } from "../models/User";
import { HttpError } from "../utils/httpError";

function issueToken(user: { _id: { toString(): string }; email: string; role: UserRole; tokenVersion: number }): string {
  return createToken({ id: user._id.toString(), email: user.email, role: user.role, tokenVersion: user.tokenVersion });
}

export async function registerPassenger(input: { name: string; email: string; password: string }) {
  if (await User.exists({ email: input.email })) {
    throw new HttpError(409, "An account with this email already exists");
  }
  const passwordHash = await bcrypt.hash(input.password, LIMITS.bcryptRounds);
  const user = await User.create({ name: input.name, email: input.email, passwordHash, role: "passenger" });
  return { user: user.toJSON(), token: issueToken(user) };
}

export async function login(email: string, password: string) {
  const user = await User.findOne({ email }).select("+passwordHash +tokenVersion");
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, "Incorrect email or password");
  }
  if (user.role === "driver" && user.driverStatus !== "approved") {
    throw new HttpError(
      403,
      user.driverStatus === "suspended"
        ? "This driver account is suspended. Contact your administrator."
        : "Your driver account is awaiting administrator verification.",
    );
  }
  return { user: user.toJSON(), token: issueToken(user) };
}

export async function getMe(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw new HttpError(404, "Account not found.");

  let assignment: Record<string, unknown> | null = null;
  if (user.role === "driver") {
    const bus = await Bus.findOne({ driverId: user._id });
    if (bus) {
      const route = bus.routeId ? await Route.findById(bus.routeId).select("name code").lean() : null;
      assignment = {
        busId: bus._id,
        label: bus.label,
        status: bus.status,
        capacity: bus.capacity,
        routeName: route?.name ?? null,
        routeCode: route?.code ?? null,
      };
    }
  }
  return { user: user.toJSON(), assignment };
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  const user = await User.findById(userId).select("+passwordHash +tokenVersion");
  if (!user) throw new HttpError(404, "Account not found.");
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new HttpError(400, "Your current password is incorrect.");
  }
  if (currentPassword === newPassword) {
    throw new HttpError(400, "Choose a new password that is different from the current one.");
  }
  user.passwordHash = await bcrypt.hash(newPassword, LIMITS.bcryptRounds);
  user.tokenVersion += 1; // Revoke every previously issued access token.
  await user.save();
}
