import express from "express";
import {
  getLast30DaysReport,
  getRunningMonthReport,
  getTodaysTransactionReport,
  getTransactions,
} from "../controllers/transactionController.js";

const router = express.Router();

//Get all transactions (infinite scroll style)
router.get("/", getTransactions);

// get today's transactions report
router.get("/today-report", getTodaysTransactionReport);

// monthly report
router.get("/monthly-report", getRunningMonthReport);

// last 30 day's report
router.get("/last-30-days", getLast30DaysReport);

export default router;
