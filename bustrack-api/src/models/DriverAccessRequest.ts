import { Schema, model, type Types } from "mongoose";
import { ACCESS_REQUEST_STATUSES, type AccessRequestStatus } from "../constants";

export interface IDriverAccessRequest {
  name: string;
  email: string;
  phone: string | null;
  reason: string | null;
  requestedRouteId: Types.ObjectId | null;
  selectedStopIndexes: number[];
  customStops: Array<{ name: string; lat: number; lon: number }>;
  customRouteName: string | null;
  drivingLicensePath: string | null;
  aadhaarCardPath: string | null;
  status: AccessRequestStatus;
  submittedAt: Date;
  reviewedAt: Date | null;
  reviewedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const driverAccessRequestSchema = new Schema<IDriverAccessRequest>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 190 },
    phone: { type: String, default: null, maxlength: 32 },
    reason: { type: String, default: null, maxlength: 500 },
    requestedRouteId: { type: Schema.Types.ObjectId, ref: "Route", default: null },
    selectedStopIndexes: { type: [Number], default: [] },
    customStops: {
      type: [{ _id: false, name: String, lat: Number, lon: Number }],
      default: [],
    },
    customRouteName: { type: String, default: null, maxlength: 120 },
    drivingLicensePath: { type: String, default: null },
    aadhaarCardPath: { type: String, default: null },
    status: { type: String, enum: [...ACCESS_REQUEST_STATUSES], default: "pending" },
    submittedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        const output = ret as unknown as Record<string, any>;
        output.id = String(output._id);
        delete output._id;
        // Stored file names are never exposed through the API.
        delete output.drivingLicensePath;
        delete output.aadhaarCardPath;
        return ret;
      },
    },
  },
);

driverAccessRequestSchema.index({ status: 1, submittedAt: -1 });

export const DriverAccessRequest = model<IDriverAccessRequest>("DriverAccessRequest", driverAccessRequestSchema);
