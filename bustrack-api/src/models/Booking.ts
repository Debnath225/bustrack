import { Schema, model, type Types } from "mongoose";
import { BOOKING_STATUSES, PAYMENT_STATUSES, type BookingStatus, type PaymentStatus } from "../constants";

export interface IBooking {
  bookingReference: string;
  userId: Types.ObjectId;
  busId: string;
  /** Service date in India time, YYYY-MM-DD. */
  travelDate: string;
  fromStopIndex: number;
  toStopIndex: number;
  segmentStart: number;
  segmentEnd: number;
  seats: number;
  unitFare: number;
  totalFare: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  boardedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    bookingReference: { type: String, required: true, unique: true, uppercase: true, match: /^[A-F0-9]{12}$/ },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    busId: { type: String, ref: "Bus", required: true },
    travelDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    fromStopIndex: { type: Number, required: true, min: 0 },
    toStopIndex: { type: Number, required: true, min: 0 },
    segmentStart: { type: Number, required: true, min: 0 },
    segmentEnd: { type: Number, required: true, min: 1 },
    seats: { type: Number, required: true, min: 1, max: 6 },
    unitFare: { type: Number, required: true, min: 0 },
    totalFare: { type: Number, required: true, min: 0 },
    status: { type: String, enum: [...BOOKING_STATUSES], default: "confirmed" },
    paymentStatus: { type: String, enum: [...PAYMENT_STATUSES], default: "due_on_board" },
    boardedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        const output = ret as unknown as Record<string, any>;
        output.id = String(output._id);
        delete output._id;
        return ret;
      },
    },
  },
);

bookingSchema.index({ busId: 1, travelDate: 1, status: 1, segmentStart: 1, segmentEnd: 1 });
bookingSchema.index({ userId: 1, createdAt: -1 });

export const Booking = model<IBooking>("Booking", bookingSchema);
