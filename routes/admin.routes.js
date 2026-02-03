import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/admin.middleware.js";
import { analytics } from "../controllers/admin.controller.js";

const router = Router();

router.get("/analytics", requireAuth, requireAdmin, analytics);

export default router;