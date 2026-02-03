import { Router } from "express";
import { searchOffers } from "../controllers/amadeus.controller.js";

const router = Router();

router.get("/offers", searchOffers);

export default router;
