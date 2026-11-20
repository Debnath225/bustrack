import cors from "cors";
import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { isDatabaseConnected } from "./config/database";
import { errorHandler, notFound } from "./middleware/error";
import { globalLimiter } from "./middleware/rateLimit";
import apiRoutes from "./routes";
import { isMqttConnected } from "./services/mqtt.service";
import { ok } from "./utils/respond";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(",") }));
  app.use(pinoHttp({ logger }));
  app.use(globalLimiter);
  app.use(express.json({ limit: "256kb" }));

  app.get("/health", (_req, res) => {
    if (!isDatabaseConnected()) {
      res.status(503).json({ success: false, message: "Database unavailable" });
      return;
    }
    ok(res, {
      api: "online",
      database: "connected",
      mqtt: isMqttConnected() ? "connected" : "disconnected",
      simulator: env.GPS_SIMULATOR_ENABLED,
      uptimeSeconds: Math.floor(process.uptime()),
      checkedAt: new Date().toISOString(),
    });
  });

  app.use("/api", apiRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
