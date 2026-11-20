import bcrypt from "bcryptjs";
import { connectDatabase, disconnectDatabase } from "../config/database";
import { logger } from "../config/logger";
import { LIMITS } from "../constants";
import { env } from "../config/env";
import { Bus } from "../models/Bus";
import { Route } from "../models/Route";
import { User } from "../models/User";

const ROUTES = [
  {
    name: "City Centre ↔ Durgapur Station",
    code: "DGP-01",
    origin: "City Centre",
    destination: "Durgapur Station",
    color: "#2563EB",
    stops: [
      { name: "City Centre", lat: 23.548, lon: 87.289 },
      { name: "Junction Mall", lat: 23.5355, lon: 87.2908 },
      { name: "Bidhannagar", lat: 23.535, lon: 87.315 },
      { name: "Durgapur Station", lat: 23.52, lon: 87.311 },
    ],
  },
  {
    name: "Benachity ↔ Muchipara",
    code: "DGP-02",
    origin: "Benachity",
    destination: "Muchipara",
    color: "#0D9488",
    stops: [
      { name: "Benachity", lat: 23.535, lon: 87.303 },
      { name: "Suhatta Mall", lat: 23.538, lon: 87.3 },
      { name: "City Centre", lat: 23.548, lon: 87.289 },
      { name: "Muchipara", lat: 23.563, lon: 87.296 },
    ],
  },
  {
    name: "Durgapur Station ↔ NIT",
    code: "DGP-03",
    origin: "Durgapur Station",
    destination: "NIT Durgapur",
    color: "#7C3AED",
    stops: [
      { name: "Durgapur Station", lat: 23.52, lon: 87.311 },
      { name: "Bidhannagar", lat: 23.535, lon: 87.315 },
      { name: "A-Zone", lat: 23.54, lon: 87.28 },
      { name: "NIT Durgapur", lat: 23.55, lon: 87.29 },
    ],
  },
];

async function seed(): Promise<void> {
  if (env.NODE_ENV === "production") {
    throw new Error("The demo seed is disabled in production because it creates known demo credentials.");
  }
  await connectDatabase();
  try {
    for (const r of ROUTES) {
      const route = await Route.findOneAndUpdate(
        { code: r.code },
        {
          $setOnInsert: {
            name: r.name,
            origin: r.origin,
            destination: r.destination,
            color: r.color,
            stops: r.stops,
          },
        },
        { upsert: true, new: true },
      );
      for (let i = 1; i <= 2; i++) {
        const busId = `${r.code.replace("-", "")}-${i}`;
        await Bus.updateOne(
          { _id: busId },
          {
            $setOnInsert: {
              label: `Bus ${busId}`,
              routeId: route?._id ?? null,
              capacity: LIMITS.defaultBusCapacity,
              status: "offline",
            },
          },
          { upsert: true },
        );
      }
    }

    await User.updateOne(
      { email: "admin@bustrack.local" },
      {
        $setOnInsert: {
          name: "Demo Administrator",
          role: "admin",
          passwordHash: await bcrypt.hash("Admin@12345", LIMITS.bcryptRounds),
        },
      },
      { upsert: true },
    );

    const driver = await User.findOneAndUpdate(
      { email: "driver@bustrack.local" },
      {
        $setOnInsert: {
          name: "Demo Driver",
          role: "driver",
          driverStatus: "approved",
          passwordHash: await bcrypt.hash("Driver@12345", LIMITS.bcryptRounds),
        },
      },
      { upsert: true, new: true },
    );
    if (driver && !(await Bus.exists({ driverId: driver._id }))) {
      const freeBus = await Bus.findOne({ driverId: null }).sort({ _id: 1 });
      if (freeBus) await Bus.updateOne({ _id: freeBus._id }, { $set: { driverId: driver._id } });
    }

    logger.info("Seed complete: demo routes, six buses, admin and driver accounts.");
  } finally {
    await disconnectDatabase();
  }
}

seed().catch((error) => {
  logger.error({ err: error }, "Seeding failed");
  process.exit(1);
});
