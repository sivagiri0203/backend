import { Router } from "express";
import { searchFlights, getFlightStatus } from "../controllers/flights.controller.js";

const router = Router();

router.get("/search", searchFlights);
router.get("/status", getFlightStatus);

export default router;