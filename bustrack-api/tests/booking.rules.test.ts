import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateTotalFare,
  getIndiaServiceDate,
  isBusLive,
  normalizeStopRange,
  shiftServiceDate,
} from "../src/services/booking.rules";

test("normalizes either travel direction and rejects invalid stop pairs", () => {
  assert.deepEqual(normalizeStopRange(3, 1, 4), { start: 1, end: 3 });
  assert.equal(normalizeStopRange(1, 1, 4), null);
  assert.equal(normalizeStopRange(0, 4, 4), null);
  assert.equal(normalizeStopRange(-1, 2, 4), null);
});

test("uses India local calendar date at UTC midnight boundaries", () => {
  assert.equal(getIndiaServiceDate(new Date("2025-01-01T18:29:00.000Z")), "2025-01-01");
  assert.equal(getIndiaServiceDate(new Date("2025-01-01T18:30:00.000Z")), "2025-01-02");
});

test("shifts service dates across month boundaries", () => {
  assert.equal(shiftServiceDate("2026-03-01", -1), "2026-02-28");
  assert.equal(shiftServiceDate("2026-12-31", 1), "2027-01-01");
});

test("a bus is live only when active and seen within the stale window", () => {
  const now = Date.parse("2026-01-01T10:00:00.000Z");
  assert.equal(isBusLive("active", new Date(now - 30_000), 90, now), true);
  assert.equal(isBusLive("active", new Date(now - 120_000), 90, now), false);
  assert.equal(isBusLive("offline", new Date(now), 90, now), false);
  assert.equal(isBusLive("active", null, 90, now), false);
});

test("total fare is rounded to paise", () => {
  assert.equal(calculateTotalFare(12.5, 3), 37.5);
  assert.equal(calculateTotalFare(10.33, 3), 30.99);
});
