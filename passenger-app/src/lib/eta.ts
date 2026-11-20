// Pure route-progress maths. No React or native imports, so it can be unit tested.

export type RouteStop = { name: string; lat: number | null; lon: number | null };
export type StopState = "passed" | "current" | "upcoming";

const EARTH_RADIUS_M = 6_371_000;
const DEFAULT_SPEED_KMH = 18;
const MIN_MOVING_SPEED_KMH = 3;

export function haversineMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Returns route stops that have coordinates, in order. Stops without coordinates are skipped. */
export function locatedStops(stops: RouteStop[]): Array<RouteStop & { lat: number; lon: number; index: number }> {
  return stops.flatMap((stop, index) =>
    stop.lat != null && stop.lon != null && Number.isFinite(stop.lat) && Number.isFinite(stop.lon)
      ? [{ ...stop, lat: stop.lat, lon: stop.lon, index }]
      : [],
  );
}

/** Cumulative distance along the route to each located stop, in metres. */
export function cumulativeDistances(points: Array<{ lat: number; lon: number }>): number[] {
  const distances = [0];
  for (let i = 1; i < points.length; i += 1) {
    distances.push(distances[i - 1] + haversineMeters(points[i - 1], points[i]));
  }
  return distances;
}

/**
 * Projects a GPS point onto the polyline. Returns how far along the route it is,
 * and how far it is from the line (metres). Uses a local flat projection, which is
 * accurate enough for the few kilometres a city route covers.
 */
export function projectOnRoute(
  points: Array<{ lat: number; lon: number }>,
  point: { lat: number; lon: number },
): { progress: number; offRouteMeters: number; segment: number } {
  if (points.length === 0) return { progress: 0, offRouteMeters: Infinity, segment: 0 };
  if (points.length === 1) {
    return { progress: 0, offRouteMeters: haversineMeters(points[0], point), segment: 0 };
  }
  const cum = cumulativeDistances(points);
  const originLat = (points[0].lat * Math.PI) / 180;
  const kx = Math.cos(originLat) * ((Math.PI / 180) * EARTH_RADIUS_M);
  const ky = (Math.PI / 180) * EARTH_RADIUS_M;
  const toXY = (p: { lat: number; lon: number }) => ({
    x: (p.lon - points[0].lon) * kx,
    y: (p.lat - points[0].lat) * ky,
  });
  const P = toXY(point);

  let best = { progress: 0, offRouteMeters: Infinity, segment: 0 };
  for (let i = 0; i < points.length - 1; i += 1) {
    const A = toXY(points[i]);
    const B = toXY(points[i + 1]);
    const abx = B.x - A.x;
    const aby = B.y - A.y;
    const lengthSquared = abx * abx + aby * aby;
    const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((P.x - A.x) * abx + (P.y - A.y) * aby) / lengthSquared));
    const closestX = A.x + t * abx;
    const closestY = A.y + t * aby;
    const offRouteMeters = Math.hypot(P.x - closestX, P.y - closestY);
    if (offRouteMeters < best.offRouteMeters) {
      best = {
        progress: cum[i] + t * (cum[i + 1] - cum[i]),
        offRouteMeters,
        segment: i,
      };
    }
  }
  return best;
}

export function effectiveSpeedKmh(speedKmh: number | null | undefined): number {
  return speedKmh != null && Number.isFinite(speedKmh) && speedKmh >= MIN_MOVING_SPEED_KMH
    ? speedKmh
    : DEFAULT_SPEED_KMH;
}

export function etaSeconds(remainingMeters: number, speedKmh: number | null | undefined): number {
  return Math.max(0, remainingMeters / (effectiveSpeedKmh(speedKmh) / 3.6));
}

export type TrackSnapshot = {
  /** Index into the located stop list where the bus currently is (last passed stop). */
  stopStates: StopState[];
  busProgressMeters: number;
  totalMeters: number;
  /** Distance still to travel to the target stop. Negative means the bus is past it. */
  remainingMeters: number;
  etaSeconds: number | null;
  passedTarget: boolean;
  offRoute: boolean;
};

/**
 * Builds everything the tracker screen needs.
 * targetIndex is an index into the located stop list.
 */
export function buildTrackSnapshot(
  stops: RouteStop[],
  bus: { lat: number; lon: number; speedKmh: number | null | undefined },
  targetIndex: number,
): TrackSnapshot | null {
  const located = locatedStops(stops);
  if (located.length < 2) return null;
  const points = located.map((s) => ({ lat: s.lat, lon: s.lon }));
  const cum = cumulativeDistances(points);
  const { progress, offRouteMeters, segment } = projectOnRoute(points, bus);
  const clampedTarget = Math.max(0, Math.min(targetIndex, located.length - 1));
  const targetProgress = cum[clampedTarget];
  const remainingMeters = targetProgress - progress;
  const passedTarget = remainingMeters < -30;
  const currentStop = Math.min(segment + (progress - cum[segment] > (cum[segment + 1] - cum[segment]) / 2 ? 1 : 0), located.length - 1);

  const stopStates: StopState[] = located.map((_, i) => {
    if (i === currentStop && Math.abs(cum[i] - progress) < 80) return "current";
    return cum[i] <= progress ? "passed" : "upcoming";
  });

  return {
    stopStates,
    busProgressMeters: progress,
    totalMeters: cum[cum.length - 1],
    remainingMeters,
    etaSeconds: passedTarget ? null : etaSeconds(remainingMeters, bus.speedKmh),
    passedTarget,
    offRoute: offRouteMeters > 400,
  };
}

export function formatEta(seconds: number | null): string {
  if (seconds == null) return "Passed";
  if (seconds < 45) return "Arriving";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.max(0, Math.round(meters))} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
