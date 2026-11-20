import { z } from "zod";
import { BOOKING_STATUSES, BUS_STATUSES, LIMITS, ROLES } from "../constants";
import { OBJECT_ID_PATTERN } from "../utils/ids";

const objectId = z.string().regex(OBJECT_ID_PATTERN, "Invalid id");
const busId = z.string().trim().regex(/^[A-Za-z0-9_-]{3,24}$/, "Invalid bus id");
const email = z.string().trim().toLowerCase().email().max(190);
const password = z.string().min(LIMITS.passwordMin).max(LIMITS.passwordMax);
const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm format.");
const capacity = z.number().int().min(1).max(LIMITS.maxBusCapacity);
// Express query values arrive as strings. Convert only scalar strings so repeated
// parameters (arrays) and nested query objects fail validation instead of being
// silently coerced into unexpected numbers.
const queryNumber = (schema: z.ZodNumber) =>
  z.preprocess(
    (value: unknown) => {
      // Express query values should be scalar strings. Reject arrays, objects,
      // missing values (unless a surrounding .default() handles them), and
      // empty strings rather than coercing them into surprising numbers.
      // Numeric values are allowed for schema defaults and direct unit tests.
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value !== "string") return Number.NaN;
      const trimmed = value.trim();
      return trimmed.length > 0 ? Number(trimmed) : Number.NaN;
    },
    schema,
  );
const pagination = {
  page: queryNumber(z.number().int().min(1)).default(1),
  limit: queryNumber(z.number().int().min(1).max(100)).default(25),
};
const nonEmpty = (value: object) => Object.keys(value).length > 0;

// ---------- auth ----------
export const credentialsSchema = z.object({ email, password }).strict();

export const registerSchema = credentialsSchema.extend({
  name: z.string().trim().min(2).max(100),
}).strict();

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(LIMITS.passwordMax),
  newPassword: password,
}).strict();

// ---------- passenger ----------
export const profileSchema = z.object({
  name: z.string().trim().min(2).max(100),
}).strict();

export const notificationPreferencesSchema = z
  .object({
    arrivalAlerts: z.boolean().optional(),
    routeAlerts: z.boolean().optional(),
    soundEnabled: z.boolean().optional(),
    vibrationEnabled: z.boolean().optional(),
    quietStart: timeOfDay.nullable().optional(),
    quietEnd: timeOfDay.nullable().optional(),
  })
  .strict()
  .refine(nonEmpty, "Provide at least one preference.");

export const availabilityQuerySchema = z.object({
  fromStopIndex: queryNumber(z.number().int().min(0)),
  toStopIndex: queryNumber(z.number().int().min(0)),
}).strict();

export const nearbyQuerySchema = z.object({
  lat: queryNumber(z.number().min(-90).max(90)),
  lon: queryNumber(z.number().min(-180).max(180)),
  radius: queryNumber(z.number().min(100).max(20000)).default(2500),
}).strict();

export const createBookingSchema = z.object({
  busId,
  fromStopIndex: z.number().int().min(0),
  toStopIndex: z.number().int().min(0),
  seats: z.number().int().min(1).max(LIMITS.maxSeatsPerBooking),
}).strict();

// ---------- driver ----------
export const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  speed: z.number().min(0).max(200).default(0),
  bearing: z.number().min(0).max(360).default(0),
  accuracy: z.number().min(0).max(10000).default(30),
}).strict();

export const faresSchema = z
  .object({
    fares: z
      .array(
        z.object({
          fromStopIndex: z.number().int().min(0),
          toStopIndex: z.number().int().min(1),
          amount: z
            .number()
            .positive()
            .max(10000)
            .refine((amount) => Math.abs(amount * 100 - Math.round(amount * 100)) < 1e-8, "Use at most two decimals."),
        }).strict(),
      )
      .max(LIMITS.maxFarePairs),
  })
  .strict();

export const bookingSettingsSchema = z.object({ enabled: z.boolean() }).strict();

// ---------- driver access requests ----------
const parseJsonField = <T extends z.ZodTypeAny>(schema: T) =>
  z
    .string()
    .transform((value, ctx) => {
      try {
        return JSON.parse(value) as unknown;
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Field must be valid JSON." });
        return z.NEVER;
      }
    })
    .pipe(schema);

const customStopSchema = z.object({
  name: z.string().trim().min(1).max(120),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
}).strict();

export const driverAccessSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email,
    phone: z.string().trim().regex(/^\+?[1-9]\d{7,14}$/).optional().transform((value) => value || null),
    reason: z.string().trim().max(500).optional().transform((value) => value || null),
    // Either an existing route (routeId + stopIndexes) or a custom route drawn on the map (customStops).
    routeId: objectId.optional(),
    stopIndexes: parseJsonField(z.array(z.number().int().min(0)).min(2).max(LIMITS.maxStops)).optional(),
    customStops: parseJsonField(z.array(customStopSchema).min(2).max(LIMITS.maxStops)).optional(),
    customRouteName: z.string().trim().min(1).max(120).optional().transform((value) => value || null),
  })
  .strict()
  .refine(
    (value) => Boolean(value.customStops) !== Boolean(value.routeId),
    "Choose an existing route or draw a custom route, not both.",
  )
  .refine(
    (value) => !value.routeId || (value.stopIndexes && value.stopIndexes.length >= 2),
    "Choose at least two stops on the requested route.",
  )
  .refine(
    (value) => !value.stopIndexes || new Set(value.stopIndexes).size === value.stopIndexes.length,
    "Choose each route stop only once.",
  )
  .refine(
    (value) => !value.customRouteName || Boolean(value.customStops),
    "A custom route name can only be used with a custom route.",
  )
  .refine(
    (value) => !value.stopIndexes || Boolean(value.routeId),
    "Stop indexes can only be used with an existing route.",
  );

export const approveAccessSchema = z
  .object({
    password,
    busId,
  })
  .strict();

// ---------- admin: routes ----------
const stopSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    lat: z.number().min(-90).max(90).nullable().optional(),
    lon: z.number().min(-180).max(180).nullable().optional(),
  })
  .strict()
  .refine((stop) => (stop.lat == null) === (stop.lon == null), "Provide both coordinates or neither.");

const routeBase = z.object({
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{2,30}$/),
  origin: z.string().trim().min(2).max(120),
  destination: z.string().trim().min(2).max(120),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#2563EB"),
  stops: z.array(stopSchema).min(2).max(LIMITS.maxStops),
});

export const routeCreateSchema = routeBase.strict();
export const routeUpdateSchema = routeBase.partial().strict().refine(nonEmpty, "Provide at least one field to update.");

// ---------- admin: buses ----------
export const busCreateSchema = z
  .object({
    busId,
    label: z.string().trim().min(2).max(80),
    routeId: objectId.nullable().optional(),
    capacity: capacity.optional(),
  })
  .strict();

export const busUpdateSchema = z
  .object({
    label: z.string().trim().min(2).max(80).optional(),
    capacity: capacity.optional(),
    routeId: objectId.nullable().optional(),
  })
  .strict()
  .refine(nonEmpty, "Provide a label, capacity, or route to update.");

export const busStatusSchema = z.object({ status: z.enum(BUS_STATUSES) }).strict();
export const busRouteSchema = z.object({ routeId: objectId.nullable() }).strict();

// ---------- admin: drivers ----------
export const driverCreateSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email,
    password,
    busId: busId.nullable().optional(),
  })
  .strict();

export const driverUpdateSchema = z.object({ name: z.string().trim().min(2).max(100) }).strict();
export const assignmentSchema = z.object({ busId: busId.nullable() }).strict();
export const driverStatusSchema = z.object({ status: z.enum(["approved", "suspended"]) }).strict();

// ---------- admin: queries ----------
export const usersQuerySchema = z.object({
  role: z.enum(ROLES).optional(),
  q: z.string().trim().max(100).optional(),
  ...pagination,
}).strict();

export const bookingsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  busId: busId.optional(),
  status: z.enum(BOOKING_STATUSES).optional(),
  ...pagination,
}).strict();

export const analyticsQuerySchema = z.object({
  days: z.enum(["7", "30"]).default("7"),
}).strict();

export type RouteCreateInput = z.infer<typeof routeCreateSchema>;
export type RouteUpdateInput = z.infer<typeof routeUpdateSchema>;
export type DriverAccessInput = z.infer<typeof driverAccessSchema>;
export type FaresInput = z.infer<typeof faresSchema>;
