import mongoose, { type ClientSession } from "mongoose";

/**
 * Runs work inside a Mongo transaction. Requires a replica set.
 * withTransaction retries transient write conflicts automatically.
 */
export async function runInTransaction<T>(work: (session: ClientSession) => Promise<T>): Promise<T> {
  const session = await mongoose.startSession();
  try {
    let result: T | undefined;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result as T;
  } finally {
    await session.endSession();
  }
}
