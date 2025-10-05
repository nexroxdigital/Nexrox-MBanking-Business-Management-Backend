import express from "express";
import {
  createDailyTransaction,
  getDailyTransactions,
  getWalletWiseReport,
} from "../controllers/dailyTxnController.js";

const router = express.Router();

// Create a daily transaction
router.post("/create", createDailyTransaction);

// get all transactions
router.get("/", getDailyTransactions);

// GET number-wise report for today
router.get("/wallet-report", getWalletWiseReport);

export default router;
