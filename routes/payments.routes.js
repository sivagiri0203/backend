import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { createRazorpayOrder, verifyRazorpayPayment } from "../controllers/payments.controller.js";

const router = Router();

router.post("/create-order", requireAuth, createRazorpayOrder);
router.post("/verify", requireAuth, verifyRazorpayPayment);

export default router;