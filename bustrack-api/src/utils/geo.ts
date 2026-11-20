export interface LatLon {
  lat: number;
  lon: number;
}

const EARTH_RADIUS_M = 6371000;
const toRad = (degrees: number) => (degrees * Math.PI) / 180;

export function distanceMeters(a: LatLon, b: LatLon): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const x =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(x));
}

export function bearing(a: LatLon, b: LatLon): number {
  const p1 = toRad(a.lat);
  const p2 = toRad(b.lat);
  const dl = toRad(b.lon - a.lon);
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
