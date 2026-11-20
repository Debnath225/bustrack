import rateLimit from "express-rate-limit";

const message = (text: string) => ({ success: false, message: text });

/** Applies to every request. */
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: message("Too many requests. Please try again later."),
});

/** Applies only to credential-handling endpoints (login, register, password change). */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: message("Too many sign-in attempts. Try again in 15 minutes."),
});

/** Public document submission is expensive and must have a tighter limit. */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: message("Too many document submissions. Try again later."),
});
