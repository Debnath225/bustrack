import { Router } from "express";
import { allowRoles, authenticate } from "../middleware/auth";
import * as c from "../controllers/driver.controller";

const router = Router();
const driverOnly = [authenticate, allowRoles("driver")];

router.get("/me", driverOnly, c.me);
router.post("/location", driverOnly, c.postLocation);

router.get("/fares", driverOnly, c.getFares);
router.put("/fares", driverOnly, c.saveFares);

router.get("/bookings/settings", driverOnly, c.getBookingSettings);
router.put("/bookings/settings", driverOnly, c.setBookingSettings);
router.get("/bookings", driverOnly, c.listBookings);
router.post("/bookings/:bookingId/board", driverOnly, c.boardBooking);
router.post("/bookings/:bookingId/no-show", driverOnly, c.markNoShow);

export default router;
