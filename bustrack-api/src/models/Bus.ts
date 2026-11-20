import { Schema, model, type Types } from "mongoose";
import { BUS_STATUSES, LIMITS, type BusStatus } from "../constants";

export interface IFare {
  fromStopIndex: number;
  toStopIndex: number;
  amount: number;
  updatedBy: Types.ObjectId;
  updatedAt: Date;
}

export interface ILastLocation {
  lat: number;
  lon: number;
  speed: number;
  bearing: number;
  accuracy: number;
  source: string;
  recordedAt: Date;
}

export interface IBus {
  /** Human-facing bus id such as DGP01-1. Used as the primary key. */
  _id: string;
  label: string;
  routeId: Types.ObjectId | null;
  capacity: number;
  status: BusStatus;
  driverId: Types.ObjectId | null;
  lastSeen: Date | null;
  lastLocation: ILastLocation | null;
  bookingsEnabled: boolean;
  fares: IFare[];
  /** Bumped inside booking transactions so concurrent bookings on one bus serialize. */
  bookingLockVersion: number;
}

const fareSchema = new Schema<IFare>(
  {
    fromStopIndex: { type: Number, required: true, min: 0 },
    toStopIndex: { type: Number, required: true, min: 1 },
    amount: { type: Number, required: true, min: 0 },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const lastLocationSchema = new Schema<ILastLocation>(
  {
    lat: Number,
    lon: Number,
    speed: Number,
    bearing: Number,
    accuracy: Number,
    source: String,
    recordedAt: Date,
  },
  { _id: false },
);

const busSchema = new Schema<IBus>(
  {
    _id: { type: String, required: true, match: /^[A-Za-z0-9_-]{3,24}$/ },
    label: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    routeId: { type: Schema.Types.ObjectId, ref: "Route", default: null, index: true },
    capacity: {
      type: Number,
      required: true,
      min: 1,
      max: LIMITS.maxBusCapacity,
      default: LIMITS.defaultBusCapacity,
    },
    status: { type: String, enum: [...BUS_STATUSES], default: "offline", index: true },
    driverId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    lastSeen: { type: Date, default: null, index: true },
    lastLocation: { type: lastLocationSchema, default: null },
    bookingsEnabled: { type: Boolean, default: false },
    fares: { type: [fareSchema], default: [] },
    bookingLockVersion: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        const output = ret as unknown as Record<string, any>;
        output.busId = output._id;
        delete output._id;
        delete output.bookingLockVersion;
        return ret;
      },
    },
  },
);

// One bus per driver: a partial unique index ignores buses with no driver.
busSchema.index(
  { driverId: 1 },
  { unique: true, partialFilterExpression: { driverId: { $type: "objectId" } } },
);

export const Bus = model<IBus>("Bus", busSchema);
