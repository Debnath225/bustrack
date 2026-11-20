import type { FilterQuery, Types } from "mongoose";
import { Bus } from "../models/Bus";
import { User, type INotificationPreferences, type IUser } from "../models/User";
import { HttpError } from "../utils/httpError";
import { env } from "../config/env";
import { isBusLive } from "./booking.rules";
import type { UserRole } from "../constants";

export async function userNames(ids: Types.ObjectId[]): Promise<Map<string, string>> {
  const users = await User.find({ _id: { $in: ids } })
    .select("name")
    .lean<Array<{ _id: Types.ObjectId; name: string }>>();
  return new Map(users.map((u): [string, string] => [String(u._id), u.name]));
}

export async function updateProfile(userId: string, name: string) {
  const user = await User.findByIdAndUpdate(userId, { $set: { name } }, { new: true });
  if (!user) throw new HttpError(404, "Account not found.");
  return user.toJSON();
}

export async function listFavorites(userId: string) {
  const user = await User.findById(userId).select("favoriteBusIds");
  if (!user) throw new HttpError(404, "Account not found.");
  const buses = await Bus.find({ _id: { $in: user.favoriteBusIds }, status: { $ne: "blocked" } }).select(
    "label status lastSeen",
  );
  return buses.map((bus) => ({
    busId: bus._id,
    label: bus.label,
    isLive: isBusLive(bus.status, bus.lastSeen, env.LOCATION_STALE_SECONDS),
  }));
}

export async function addFavorite(userId: string, busId: string): Promise<void> {
  if (!(await Bus.exists({ _id: busId }))) throw new HttpError(404, "Bus not found.");
  await User.updateOne({ _id: userId }, { $addToSet: { favoriteBusIds: busId } });
}

export async function removeFavorite(userId: string, busId: string): Promise<void> {
  await User.updateOne({ _id: userId }, { $pull: { favoriteBusIds: busId } });
}

export async function getNotificationPreferences(userId: string): Promise<INotificationPreferences> {
  const user = await User.findById(userId).select("notificationPreferences");
  if (!user) throw new HttpError(404, "Account not found.");
  return user.notificationPreferences;
}

export async function updateNotificationPreferences(
  userId: string,
  patch: Partial<INotificationPreferences>,
): Promise<INotificationPreferences> {
  const set: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) set[`notificationPreferences.${key}`] = value;
  }
  const user = await User.findByIdAndUpdate(userId, { $set: set }, { new: true }).select("notificationPreferences");
  if (!user) throw new HttpError(404, "Account not found.");
  return user.notificationPreferences;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function listUsers(query: { role?: UserRole; q?: string; page: number; limit: number }) {
  const filter: FilterQuery<IUser> = {};
  if (query.role) filter.role = query.role;
  if (query.q) {
    const pattern = new RegExp(escapeRegex(query.q), "i");
    filter.$or = [{ name: pattern }, { email: pattern }];
  }
  const [total, users] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
  ]);
  return { users, page: query.page, limit: query.limit, total };
}
