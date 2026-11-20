import { Bus } from "../models/Bus";
import { LocationPing } from "../models/LocationPing";
import type { GpsPoint } from "../types/location";

/**
 * Stores a GPS ping and updates the bus's latest position.
 * Older out-of-order pings never overwrite a newer lastLocation.
 */
export async function recordLocation(busId: string, point: GpsPoint): Promise<void> {
  const recordedAt = point.recordedAt ? new Date(point.recordedAt) : new Date();

  await LocationPing.create({
    busId,
    lat: point.lat,
    lon: point.lon,
    speed: point.speed,
    bearing: point.bearing,
    accuracy: point.accuracy,
    source: point.source,
    recordedAt,
  });

  await Bus.updateOne(
    {
      _id: busId,
      status: { $ne: "blocked" },
      $or: [{ lastSeen: null }, { lastSeen: { $lte: recordedAt } }],
    },
    {
      $set: {
        status: "active",
        lastSeen: recordedAt,
        lastLocation: {
          lat: point.lat,
          lon: point.lon,
          speed: point.speed,
          bearing: point.bearing,
          accuracy: point.accuracy,
          source: point.source,
          recordedAt,
        },
      },
    },
  );
}
