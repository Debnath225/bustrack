import mqtt, { type MqttClient } from "mqtt";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { Bus } from "../models/Bus";
import { parseMqttLocationMessage } from "../utils/mqttLocation";
import { recordLocation } from "./location.service";

const MAX_PAYLOAD_BYTES = 2048;
let connected = false;

export function isMqttConnected(): boolean {
  return connected;
}

async function handleMessage(topic: string, payload: Buffer): Promise<void> {
  try {
    if (payload.length > MAX_PAYLOAD_BYTES) {
      logger.warn({ topic, bytes: payload.length }, "Ignoring oversized MQTT location message");
      return;
    }
    const result = parseMqttLocationMessage(topic, payload, env.MQTT_TOPIC);
    if (!result.success) {
      logger.warn({ topic, reason: result.reason }, "Ignoring invalid MQTT location message");
      return;
    }
    const known = await Bus.exists({ _id: result.busId, status: { $ne: "blocked" } });
    if (!known) {
      logger.warn({ busId: result.busId }, "Ignoring MQTT location for an unknown or blocked bus");
      return;
    }
    await recordLocation(result.busId, result.point);
  } catch (error) {
    logger.error({ err: error, topic }, "MQTT location processing failed");
  }
}

export function startMqttConsumer() {
  let stopping = false;
  const client: MqttClient = mqtt.connect(env.MQTT_BROKER_URL, {
    clientId: `bustrack-api-${process.pid}`,
    clean: true,
    username: env.MQTT_USERNAME,
    password: env.MQTT_PASSWORD,
    connectTimeout: 10000,
    reconnectPeriod: 5000,
  });

  client.on("connect", () => {
    connected = true;
    logger.info({ broker: env.MQTT_BROKER_URL, topic: env.MQTT_TOPIC }, "MQTT consumer connected");
    client.subscribe(env.MQTT_TOPIC, { qos: 1 }, (error) => {
      if (error) logger.error({ err: error }, "MQTT location subscription failed");
    });
  });

  client.on("message", (topic, payload) => void handleMessage(topic, payload));

  client.on("close", () => {
    connected = false;
    if (!stopping) logger.warn("MQTT consumer disconnected; reconnecting");
  });
  client.on("error", (error) => logger.error({ err: error }, "MQTT consumer error"));

  return {
    stop: () =>
      new Promise<void>((resolve, reject) => {
        stopping = true;
        client.end(false, {}, (error) => {
          connected = false;
          if (error) reject(error);
          else resolve();
        });
      }),
  };
}
