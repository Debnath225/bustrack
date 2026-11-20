import { Schema, model } from "mongoose";
import { env } from "../config/env";

export interface ILocationPing {
  busId: string;
  lat: number;
  lon: number;
  speed: number;
  bearing: number;
  accuracy: number;
  source: string;
  recordedAt: Date;
}

const locationPingSchema = new Schema<ILocationPing>(
  {
    busId: { type: String, required: true },
    lat: { type: Number, required: true },
    lon: { type: Number, required: true },
    speed: { type: Number, default: 0 },
    bearing: { type: Number, default: 0 },
    accuracy: { type: Number, default: 30 },
    source: { type: String, default: "UNKNOWN" },
    recordedAt: { type: Date, required: true },
  },
  { versionKey: false },
);

locationPingSchema.index({ busId: 1, recordedAt: -1 });
// GPS history older than the retention window is removed automatically.
locationPingSchema.index({ recordedAt: 1 }, { expireAfterSeconds: env.LOCATION_RETENTION_DAYS * 86400 });

export const LocationPing = model<ILocationPing>("LocationPing", locationPingSchema);
