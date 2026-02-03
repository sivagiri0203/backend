import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { cancelBooking, createBooking, getBooking, myBookings } from "../controllers/bookings.controller.js";

const router = Router();

router.post("/", requireAuth, createBooking);
router.get("/me", requireAuth, myBookings);
router.get("/:id", requireAuth, getBooking);
router.patch("/:id/cancel", requireAuth, cancelBooking);

export default router;