import mongoose from "mongoose";
import { env } from "./env";

mongoose.set("strictQuery", true);

export async function connectDatabase(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
