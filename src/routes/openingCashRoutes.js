import express from "express";
import {
  getTodayOpeningCash,
  setOpeningCash,
} from "../controllers/openingCashController.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.get("/today", verifyToken, verifyAdmin, getTodayOpeningCash);
router.post("/set", verifyToken, verifyAdmin, setOpeningCash);

export default router;
