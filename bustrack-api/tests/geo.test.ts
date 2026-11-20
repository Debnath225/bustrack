import assert from "node:assert/strict";
import test from "node:test";
import { bearing, distanceMeters } from "../src/utils/geo";

test("distance between identical points is zero", () => {
  assert.equal(distanceMeters({ lat: 23.5, lon: 87.3 }, { lat: 23.5, lon: 87.3 }), 0);
});

test("one degree of latitude is roughly 111 km", () => {
  const meters = distanceMeters({ lat: 23, lon: 87 }, { lat: 24, lon: 87 });
  assert.ok(meters > 110_500 && meters < 111_500, `got ${meters}`);
});

test("bearing due east is 90 degrees", () => {
  const degrees = bearing({ lat: 0, lon: 0 }, { lat: 0, lon: 1 });
  assert.ok(Math.abs(degrees - 90) < 0.01, `got ${degrees}`);
});
