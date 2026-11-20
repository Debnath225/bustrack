import { Router } from "express";
import { authLimiter, uploadLimiter } from "../middleware/rateLimit";
import { authenticate } from "../middleware/auth";
import { parseDriverDocuments } from "../middleware/driverDocumentUpload";
import * as c from "../controllers/auth.controller";

const router = Router();

router.post("/register", authLimiter, c.register);
router.post("/login", authLimiter, c.login);
router.get("/me", authenticate, c.me);
router.put("/password", authenticate, authLimiter, c.changePassword);
router.post("/driver-access-requests", uploadLimiter, parseDriverDocuments, c.submitDriverAccessRequest);

export default router;
