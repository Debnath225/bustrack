import assert from "node:assert/strict";
import test from "node:test";
import { parseMqttLocationMessage } from "../src/utils/mqttLocation";

const topicFilter = "bustrack/bus/+/location";

test("parses a valid GPS message and applies optional field defaults", () => {
  const result = parseMqttLocationMessage(
    "bustrack/bus/DGP01-1/location",
    Buffer.from(JSON.stringify({ lat: 23.548, lon: 87.289 })),
    topicFilter,
  );

  assert.deepEqual(result, {
    success: true,
    busId: "DGP01-1",
    point: { lat: 23.548, lon: 87.289, speed: 0, bearing: 0, accuracy: 30, source: "MQTT_GPS" },
  });
});

test("rejects topics outside the configured bus location filter", () => {
  const result = parseMqttLocationMessage(
    "bustrack/bus/DGP01-1/status",
    Buffer.from(JSON.stringify({ lat: 23.548, lon: 87.289 })),
    topicFilter,
  );
  assert.equal(result.success, false);
});

test("rejects invalid coordinates and stale timestamps", () => {
  const invalidCoordinates = parseMqttLocationMessage(
    "bustrack/bus/DGP01-1/location",
    Buffer.from(JSON.stringify({ lat: 91, lon: 87.289 })),
    topicFilter,
  );
  const staleTimestamp = parseMqttLocationMessage(
    "bustrack/bus/DGP01-1/location",
    Buffer.from(JSON.stringify({ lat: 23.548, lon: 87.289, recordedAt: "2000-01-01T00:00:00.000Z" })),
    topicFilter,
  );
  assert.equal(invalidCoordinates.success, false);
  assert.equal(staleTimestamp.success, false);
});
