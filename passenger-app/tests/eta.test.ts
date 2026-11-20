import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTrackSnapshot,
  formatEta,
  haversineMeters,
  projectOnRoute,
  etaSeconds,
} from "../src/lib/eta";

// A straight east-west route, roughly 1 km per 0.009 degrees of longitude at this latitude.
const stops = [
  { name: "A", lat: 23.5, lon: 87.3 },
  { name: "B", lat: 23.5, lon: 87.309 },
  { name: "C", lat: 23.5, lon: 87.318 },
];

test("haversine matches a known short distance within 1%", () => {
  const d = haversineMeters({ lat: 23.5, lon: 87.3 }, { lat: 23.5, lon: 87.309 });
  assert.ok(Math.abs(d - 920) < 15, `got ${d}`);
});

test("projection finds progress along the route", () => {
  const points = stops.map((s) => ({ lat: s.lat, lon: s.lon }));
  const half = projectOnRoute(points, { lat: 23.5, lon: 87.3135 });
  const total = projectOnRoute(points, { lat: 23.5, lon: 87.318 });
  assert.ok(half.progress > 0 && half.progress < total.progress);
  assert.ok(half.offRouteMeters < 1);
});

test("snapshot marks stops passed, current and upcoming", () => {
  const snap = buildTrackSnapshot(stops, { lat: 23.5, lon: 87.3095, speedKmh: 30 }, 2);
  assert.ok(snap);
  assert.equal(snap.stopStates[0], "passed");
  assert.equal(snap.stopStates[2], "upcoming");
  assert.ok(snap.remainingMeters > 0);
  assert.ok(snap.etaSeconds != null && snap.etaSeconds > 0);
});

test("reports passed target when the bus is beyond it", () => {
  const snap = buildTrackSnapshot(stops, { lat: 23.5, lon: 87.315, speedKmh: 30 }, 1);
  assert.ok(snap);
  assert.equal(snap.passedTarget, true);
  assert.equal(snap.etaSeconds, null);
  assert.equal(formatEta(snap.etaSeconds), "Passed");
});

test("ETA uses a sensible fallback when the bus is stationary", () => {
  const seconds = etaSeconds(1800, 0);
  assert.ok(Math.abs(seconds - 1800 / (18 / 3.6)) < 0.001);
});

test("formatEta handles arriving, minutes and hours", () => {
  assert.equal(formatEta(20), "Arriving");
  assert.equal(formatEta(9 * 60), "9 min");
  assert.equal(formatEta(75 * 60), "1 h 15 min");
});

test("returns null when fewer than two stops have coordinates", () => {
  assert.equal(
    buildTrackSnapshot([{ name: "X", lat: null, lon: null }], { lat: 0, lon: 0, speedKmh: 0 }, 0),
    null,
  );
});
