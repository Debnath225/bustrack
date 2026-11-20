import { z } from "zod";
import type { GpsPoint } from "../types/location";

const locationSchema = z
  .object({
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
    speed: z.number().min(0).max(200).default(0),
    bearing: z.number().min(0).max(360).default(0),
    accuracy: z.number().min(0).max(10000).default(30),
    recordedAt: z.string().datetime({ offset: true }).optional(),
    ts: z.string().datetime({ offset: true }).optional(),
  })
  .strict();

export type MqttLocationResult =
  | { success: true; busId: string; point: GpsPoint }
  | { success: false; reason: string };

export function parseMqttLocationMessage(topic: string, payload: Buffer, topicFilter: string): MqttLocationResult {
  const topicParts = topic.split("/");
  const filterParts = topicFilter.split("/");
  if (
    topicParts.length !== filterParts.length ||
    filterParts.some((part, index) => part !== "+" && part !== topicParts[index])
  ) {
    return { success: false, reason: "topic does not match the configured filter" };
  }

  const busId = topicParts[2];
  if (!/^[A-Za-z0-9:_-]{1,24}$/.test(busId)) {
    return { success: false, reason: "topic contains an invalid bus ID" };
  }

  let data: unknown;
  try {
    data = JSON.parse(payload.toString("utf8"));
  } catch {
    return { success: false, reason: "payload is not valid JSON" };
  }

  const parsed = locationSchema.safeParse(data);
  if (!parsed.success) return { success: false, reason: "payload does not contain valid GPS data" };

  const recordedAt = parsed.data.recordedAt || parsed.data.ts;
  if (recordedAt) {
    const timestamp = new Date(recordedAt).getTime();
    const now = Date.now();
    if (!Number.isFinite(timestamp) || timestamp > now + 60000 || timestamp < now - 86400000) {
      return { success: false, reason: "GPS timestamp is outside the accepted time window" };
    }
  }

  return {
    success: true,
    busId,
    point: {
      lat: parsed.data.lat,
      lon: parsed.data.lon,
      speed: parsed.data.speed,
      bearing: parsed.data.bearing,
      accuracy: parsed.data.accuracy,
      source: "MQTT_GPS",
      ...(recordedAt ? { recordedAt } : {}),
    },
  };
}
