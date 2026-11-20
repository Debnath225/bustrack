import mongoose from "mongoose";
import { env } from "./env";

mongoose.set("strictQuery", true);

// Reuse one in-flight connection promise across concurrent requests and warm
// Vercel invocations. Creating a new Mongo connection for every request can
// exhaust Atlas connection limits under serverless concurrency.
let connectionPromise: Promise<typeof mongoose> | null = null;

// If Atlas closes an idle socket or the cluster is restarted, a previously
// resolved connection promise must not prevent the next request from reconnecting.
mongoose.connection.on("disconnected", () => {
  connectionPromise = null;
});

export async function connectDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 10,
        minPoolSize: 0,
        maxIdleTimeMS: 60000,
      })
      .catch((error: unknown) => {
        connectionPromise = null;
        throw error;
      });
  }

  await connectionPromise;
}

export async function disconnectDatabase(): Promise<void> {
  connectionPromise = null;
  await mongoose.disconnect();
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
