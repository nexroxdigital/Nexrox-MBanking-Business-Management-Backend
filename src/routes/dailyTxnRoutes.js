import express from "express";
import {
  createDailyTransaction,
  getDailyTransactions,
} from "../controllers/dailyTxnController.js";

const router = express.Router();

// Create a daily transaction
router.post("/create", createDailyTransaction);

// get all transactions
router.get("/", getDailyTransactions);

export default router;
