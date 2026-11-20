import { readFileSync } from "fs";
import { resolve } from "path";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { Bus } from "../models/Bus";
import { Route, type RouteLean } from "../models/Route";
import { bearing } from "../utils/geo";
import { recordLocation } from "./location.service";

interface SimulatorConfig {
  intervalMs: number;
  speedKmh: { min: number; max: number };
  accuracyMeters: number;
  movementFractionPerTick: number;
}

const DEFAULTS: SimulatorConfig = {
  intervalMs: 5000,
  speedKmh: { min: 18, max: 38 },
  accuracyMeters: 8,
  movementFractionPerTick: 0.18,
};

function loadConfig(): SimulatorConfig {
  try {
    return { ...DEFAULTS, ...JSON.parse(readFileSync(resolve(process.cwd(), "simulator/config.json"), "utf8")) };
  } catch {
    return DEFAULTS;
  }
}

interface Track {
  routeId: string;
  index: number;
  progress: number;
  points: Array<{ lat: number; lon: number }>;
}

const tracks = new Map<string, Track>();
let busy = false;

async function loadTrack(routeId: string): Promise<Track["points"] | null> {
  const route = await Route.findById(routeId).lean<RouteLean>();
  const points = (route?.stops ?? []).flatMap((stop) =>
    stop.lat != null && stop.lon != null ? [{ lat: stop.lat, lon: stop.lon }] : [],
  );
  return points.length >= 2 ? points : null;
}

async function tick(cfg: SimulatorConfig): Promise<void> {
  if (busy) return;
  busy = true;
  try {
    const buses = await Bus.find({ status: { $ne: "blocked" }, routeId: { $ne: null } }).select("_id routeId");
    for (const bus of buses) {
      const busId = bus._id;
      const routeId = String(bus.routeId);
      let track = tracks.get(busId);
      if (!track || track.routeId !== routeId) {
        const points = await loadTrack(routeId);
        if (!points) continue;
        track = { routeId, index: 0, progress: 0, points };
        tracks.set(busId, track);
      }

      const n = track.points.length;
      track.progress += cfg.movementFractionPerTick;
      if (track.progress >= 1) {
        track.progress = 0;
        track.index = (track.index + 1) % n;
      }
      const a = track.points[track.index];
      const b = track.points[(track.index + 1) % n];
      const lat = a.lat + (b.lat - a.lat) * track.progress;
      const lon = a.lon + (b.lon - a.lon) * track.progress;
      const speed = cfg.speedKmh.min + Math.random() * (cfg.speedKmh.max - cfg.speedKmh.min);

      await recordLocation(busId, {
        lat,
        lon,
        speed,
        bearing: bearing(a, b),
        accuracy: cfg.accuracyMeters,
        source: "SIMULATOR",
      });
    }
  } catch (error) {
    logger.error({ err: error }, "GPS simulator tick failed");
  } finally {
    busy = false;
  }
}

export function startSimulator(): NodeJS.Timeout {
  const cfg = loadConfig();
  const interval = env.GPS_SIMULATOR_INTERVAL_MS || cfg.intervalMs;
  logger.info({ interval }, "GPS simulator enabled");
  const run = () => void tick(cfg);
  run();
  return setInterval(run, interval);
}
