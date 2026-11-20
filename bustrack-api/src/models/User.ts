import { Schema, model } from "mongoose";
import { DRIVER_STATUSES, ROLES, type DriverStatus, type UserRole } from "../constants";

export interface INotificationPreferences {
  arrivalAlerts: boolean;
  routeAlerts: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  quietStart: string | null;
  quietEnd: string | null;
}

export interface IUser {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  tokenVersion: number;
  driverStatus?: DriverStatus;
  favoriteBusIds: string[];
  notificationPreferences: INotificationPreferences;
  createdAt: Date;
  updatedAt: Date;
}

const timeOfDay = {
  type: String,
  default: null,
  match: [/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm format."],
};

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 190 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: [...ROLES], default: "passenger", index: true },
    tokenVersion: { type: Number, default: 0, min: 0, select: false },
    driverStatus: { type: String, enum: [...DRIVER_STATUSES] },
    favoriteBusIds: { type: [String], default: [] },
    notificationPreferences: {
      arrivalAlerts: { type: Boolean, default: true },
      routeAlerts: { type: Boolean, default: true },
      soundEnabled: { type: Boolean, default: true },
      vibrationEnabled: { type: Boolean, default: true },
      quietStart: timeOfDay,
      quietEnd: timeOfDay,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        const output = ret as unknown as Record<string, any>;
        output.id = String(output._id);
        delete output._id;
        delete output.passwordHash;
        delete output.tokenVersion;
        return ret;
      },
    },
  },
);

export const User = model<IUser>("User", userSchema);
