import { Router } from "express";
import { allowRoles, authenticate } from "../middleware/auth";
import * as c from "../controllers/passenger.controller";

const router = Router();
const passengerOnly = [authenticate, allowRoles("passenger")];

// Public: anyone can browse routes and live buses.
router.get("/routes", c.listRoutes);
router.get("/routes/:routeId", c.getRoute);
router.get("/buses", c.listBuses);
router.get("/bus/:busId", c.getBus);
router.get("/bus/:busId/history", c.getBusHistory);
router.get("/bus/:busId/availability", c.getAvailability);
router.get("/nearby", c.getNearby);

// Passenger account.
router.get("/me", passengerOnly, c.getMe);
router.patch("/me", passengerOnly, c.updateMe);
router.get("/favorites", passengerOnly, c.listFavorites);
router.post("/favorites/:busId", passengerOnly, c.addFavorite);
router.delete("/favorites/:busId", passengerOnly, c.removeFavorite);
router.get("/notification-preferences", passengerOnly, c.getPreferences);
router.put("/notification-preferences", passengerOnly, c.updatePreferences);

// Bookings.
router.get("/bookings", passengerOnly, c.listBookings);
router.post("/bookings", passengerOnly, c.createBooking);
router.get("/bookings/:bookingId", passengerOnly, c.getBooking);
router.post("/bookings/:bookingId/cancel", passengerOnly, c.cancelBooking);

export default router;
