import { Router } from "express";
import { getFlightStatus, searchFlights } from "../controllers/flights.controller.js";

const router = Router();

router.get("/search", searchFlights);
router.get("/status", getFlightStatus);

export default router;
