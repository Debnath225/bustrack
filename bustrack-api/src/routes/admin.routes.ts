import { Router } from "express";
import { allowRoles, authenticate } from "../middleware/auth";
import * as c from "../controllers/admin.controller";

const router = Router();
router.use(authenticate, allowRoles("admin"));

// Overview
router.get("/overview", c.overview);
router.get("/analytics", c.getAnalytics);
router.get("/activity", c.activity);
router.get("/fleet", c.fleet);

// Routes
router.get("/routes", c.listRoutes);
router.post("/routes", c.createRoute);
router.get("/routes/:routeId", c.getRoute);
router.put("/routes/:routeId", c.updateRoute);
router.delete("/routes/:routeId", c.deleteRoute);

// Buses
router.get("/buses/:busId", c.getBus);
router.post("/buses", c.createBus);
router.patch("/buses/:busId", c.updateBus);
router.patch("/buses/:busId/status", c.setBusStatus);
router.patch("/buses/:busId/route", c.setBusRoute);
router.delete("/buses/:busId", c.deleteBus);

// Drivers
router.get("/drivers", c.listDrivers);
router.post("/drivers", c.createDriver);
router.get("/drivers/review", c.listDriverReview);
router.patch("/drivers/:driverId", c.updateDriver);
router.put("/drivers/:driverId/assignment", c.assignDriver);
router.patch("/drivers/:driverId/status", c.setDriverStatus);
router.delete("/drivers/:driverId", c.deleteDriver);

// Users and bookings
router.get("/users", c.listUsers);
router.get("/bookings", c.listBookings);

// Driver access requests
router.get("/driver-access-requests", c.listAccessRequests);
router.get("/driver-access-requests/:requestId/documents/:documentType", c.getAccessDocument);
router.post("/driver-access-requests/:requestId/approve", c.approveAccessRequest);
router.post("/driver-access-requests/:requestId/reject", c.rejectAccessRequest);

export default router;
