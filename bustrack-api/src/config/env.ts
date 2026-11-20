import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const onOff = (defaultValue: "true" | "false") =>
  z
    .enum(["true", "false"])
    .default(defaultValue)
    .transform((value) => value === "true");

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
    JWT_EXPIRES_IN: z.string().default("12h"),
    MONGODB_URI: z
      .string()
      .refine((value) => value.startsWith("mongodb://") || value.startsWith("mongodb+srv://"), {
        message: "MONGODB_URI must start with mongodb:// or mongodb+srv://",
      })
      .default("mongodb://127.0.0.1:27017/bustrack_india?replicaSet=rs0&directConnection=true"),
    CORS_ORIGIN: z.string().default("http://localhost:8081,http://localhost:19006"),
    MQTT_ENABLED: onOff("false"),
    MQTT_USERNAME: z.string().max(128).optional(),
    MQTT_PASSWORD: z.string().max(256).optional(),
    MQTT_BROKER_URL: z
      .string()
      .refine((value) => value.startsWith("mqtt://") || value.startsWith("mqtts://"), {
        message: "MQTT_BROKER_URL must start with mqtt:// or mqtts://",
      })
      .default("mqtt://broker.hivemq.com:1883"),
    MQTT_TOPIC: z
      .string()
      .regex(/^[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/\+\/location$/, "MQTT_TOPIC must look like bustrack/bus/+/location")
      .default("bustrack/bus/+/location"),
    GPS_SIMULATOR_ENABLED: onOff("false"),
    GPS_SIMULATOR_INTERVAL_MS: z.coerce.number().int().min(1000).default(5000),
    LOCATION_STALE_SECONDS: z.coerce.number().int().min(10).default(90),
    LOCATION_RETENTION_DAYS: z.coerce.number().int().min(1).max(365).default(7),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV !== "production") return;
    if (value.JWT_SECRET.toLowerCase().includes("replace-this") || value.JWT_SECRET.toLowerCase().includes("change-me")) {
      ctx.addIssue({ code: "custom", path: ["JWT_SECRET"], message: "Use a unique randomly generated JWT_SECRET in production." });
    }
    if (value.MONGODB_URI.startsWith("mongodb://") && !/[?&]tls=true(?:&|$)/i.test(value.MONGODB_URI)) {
      ctx.addIssue({ code: "custom", path: ["MONGODB_URI"], message: "Production MongoDB connections must use mongodb+srv:// or tls=true." });
    }
    if (value.CORS_ORIGIN.trim() === "*") {
      ctx.addIssue({ code: "custom", path: ["CORS_ORIGIN"], message: "Set an explicit origin allowlist in production." });
    }
    if (value.MQTT_ENABLED && (!value.MQTT_BROKER_URL.startsWith("mqtts://") || !value.MQTT_USERNAME || !value.MQTT_PASSWORD)) {
      ctx.addIssue({ code: "custom", path: ["MQTT_BROKER_URL"], message: "Production MQTT requires mqtts:// and broker credentials." });
    }
    if (value.GPS_SIMULATOR_ENABLED) {
      ctx.addIssue({ code: "custom", path: ["GPS_SIMULATOR_ENABLED"], message: "Disable simulated GPS in production." });
    }
  });

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration");
}

export const env = parsed.data;
