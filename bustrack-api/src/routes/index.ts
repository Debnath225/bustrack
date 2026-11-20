import { Router } from "express";
import adminRoutes from "./admin.routes";
import authRoutes from "./auth.routes";
import driverRoutes from "./driver.routes";
import passengerRoutes from "./passenger.routes";

const api = Router();
api.use("/auth", authRoutes);
api.use("/passenger", passengerRoutes);
api.use("/driver", driverRoutes);
api.use("/admin", adminRoutes);

export default api;
