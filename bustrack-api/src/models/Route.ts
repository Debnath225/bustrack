import { Schema, model, type Types } from "mongoose";
import { LIMITS } from "../constants";

export interface IStop {
  name: string;
  lat: number | null;
  lon: number | null;
}

export interface IRoute {
  name: string;
  code: string;
  origin: string;
  destination: string;
  color: string;
  stops: IStop[];
  createdAt: Date;
  updatedAt: Date;
}

export type RouteLean = IRoute & { _id: Types.ObjectId };

const stopSchema = new Schema<IStop>(
  {
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
    lat: { type: Number, min: -90, max: 90, default: null },
    lon: { type: Number, min: -180, max: 180, default: null },
  },
  { _id: false },
);

const routeSchema = new Schema<IRoute>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, match: /^[A-Z0-9-]{2,30}$/ },
    origin: { type: String, required: true, trim: true, maxlength: 120 },
    destination: { type: String, required: true, trim: true, maxlength: 120 },
    color: { type: String, default: "#2563EB", match: /^#[0-9A-Fa-f]{6}$/ },
    stops: {
      type: [stopSchema],
      validate: {
        validator: (value: IStop[]) => value.length >= 2 && value.length <= LIMITS.maxStops,
        message: `A route needs between 2 and ${LIMITS.maxStops} stops.`,
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = String(ret._id);
        delete ret._id;
        return ret;
      },
    },
  },
);

export const Route = model<IRoute>("Route", routeSchema);
