import { createApp } from "./application";
import { connectDatabase, disconnectDatabase } from "./config/database";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { startMqttConsumer } from "./services/mqtt.service";
import { startSimulator } from "./services/simulator.service";

async function main(): Promise<void> {
  await connectDatabase();
  logger.info("Connected to MongoDB");

  const app = createApp();
  const server = app.listen(env.PORT, "0.0.0.0", () => {
    logger.info({ port: env.PORT }, "BusTrack API listening on all interfaces");
  });
  server.requestTimeout = 30_000;
  server.headersTimeout = 35_000;
  server.keepAliveTimeout = 5_000;

  const mqtt = env.MQTT_ENABLED ? startMqttConsumer() : null;
  const simulator = env.GPS_SIMULATOR_ENABLED ? startSimulator() : null;

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "Shutting down BusTrack API");
    if (simulator) clearInterval(simulator);

    const forceExit = setTimeout(() => process.exit(1), 10000);
    forceExit.unref();

    try {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
      });
      await mqtt?.stop();
      await disconnectDatabase();
      clearTimeout(forceExit);
      process.exit(0);
    } catch (error) {
      logger.error({ err: error }, "Shutdown failed");
      process.exit(1);
    }
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error) => {
  logger.fatal({ err: error }, "Failed to start BusTrack API");
  process.exit(1);
});
