import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDatabase, disconnectDatabase } from "../config/database";
import { env } from "../config/env";
import { LIMITS } from "../constants";
import { User } from "../models/User";
import { logger } from "../config/logger";

const inputSchema = z.object({
  ADMIN_BOOTSTRAP_NAME: z.string().trim().min(2).max(100),
  ADMIN_BOOTSTRAP_EMAIL: z.string().trim().toLowerCase().email().max(190),
  ADMIN_BOOTSTRAP_PASSWORD: z.string().min(12).max(LIMITS.passwordMax),
}).strict();

async function bootstrapAdmin(): Promise<void> {
  const parsed = inputSchema.safeParse({
    ADMIN_BOOTSTRAP_NAME: process.env.ADMIN_BOOTSTRAP_NAME,
    ADMIN_BOOTSTRAP_EMAIL: process.env.ADMIN_BOOTSTRAP_EMAIL,
    ADMIN_BOOTSTRAP_PASSWORD: process.env.ADMIN_BOOTSTRAP_PASSWORD,
  });
  if (!parsed.success) {
    throw new Error("Set ADMIN_BOOTSTRAP_NAME, ADMIN_BOOTSTRAP_EMAIL and a 12–72 character ADMIN_BOOTSTRAP_PASSWORD.");
  }

  await connectDatabase();
  try {
    if (await User.exists({ role: "admin" })) {
      throw new Error("An administrator already exists. Bootstrap is a one-time operation.");
    }
    if (await User.exists({ email: parsed.data.ADMIN_BOOTSTRAP_EMAIL })) {
      throw new Error("That email already belongs to an account; use a different administrator email.");
    }

    const passwordHash = await bcrypt.hash(parsed.data.ADMIN_BOOTSTRAP_PASSWORD, LIMITS.bcryptRounds);
    await User.create({
      name: parsed.data.ADMIN_BOOTSTRAP_NAME,
      email: parsed.data.ADMIN_BOOTSTRAP_EMAIL,
      passwordHash,
      role: "admin",
      tokenVersion: 0,
    });
    logger.info({ email: parsed.data.ADMIN_BOOTSTRAP_EMAIL }, "Initial administrator created");
  } finally {
    await disconnectDatabase();
  }
}

bootstrapAdmin().catch((error) => {
  logger.error({ err: error }, "Administrator bootstrap failed");
  process.exitCode = 1;
});
