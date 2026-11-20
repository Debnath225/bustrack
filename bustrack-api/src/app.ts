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
  const allowedOrigins = env.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean);
  app.use(cors({
    origin(origin, callback) {
      // Non-browser clients do not send Origin; browser origins must be allowlisted.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 600,
  }));
  app.use(pinoHttp({ logger }));
  app.use(globalLimiter);
  app.use(express.json({ limit: "256kb", strict: true, type: "application/json" }));
  app.use((req, res, next) => {
    if (["POST", "PUT", "PATCH"].includes(req.method) && req.path.startsWith("/api/") &&
        req.headers["content-type"] && !req.is(["application/json", "multipart/form-data"])) {
      res.status(415).json({ success: false, message: "Unsupported content type." });
      return;
    }
    next();
  });

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
