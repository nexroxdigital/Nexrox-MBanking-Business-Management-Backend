import express from "express";
import {
  deleteTransaction,
  getLast30DaysReport,
  getRunningMonthReport,
  getTodaysTransactionReport,
  getTransactions,
  updateTransaction,
} from "../controllers/transactionController.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

//Get all transactions (infinite scroll style)
router.get("/", verifyToken, verifyAdmin, getTransactions);

// get today's transactions report
router.get(
  "/today-report",
  verifyToken,
  verifyAdmin,
  getTodaysTransactionReport
);

// monthly report
router.get("/monthly-report", verifyToken, verifyAdmin, getRunningMonthReport);

// last 30 day's report
router.get("/last-30-days", verifyToken, verifyAdmin, getLast30DaysReport);

router.delete("/delete/:id", deleteTransaction);

// update transactions
router.patch("/update/:id", updateTransaction);

export default router;
