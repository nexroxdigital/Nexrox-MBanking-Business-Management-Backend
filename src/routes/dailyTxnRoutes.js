import express from "express";
import {
  createDailyTransaction,
  deleteDailyTransaction,
  editDailyTransaction,
  getDailyTransactions,
  getWalletWiseReport,
} from "../controllers/dailyTxnController.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// Create a daily transaction
router.post("/create", verifyToken, verifyAdmin, createDailyTransaction);

// get all transactions
router.get("/", verifyToken, verifyAdmin, getDailyTransactions);

// GET number-wise report for today
router.get("/wallet-report", verifyToken, verifyAdmin, getWalletWiseReport);

// delete daily txn
router.delete("/delete/:id", verifyToken, verifyAdmin, deleteDailyTransaction);

// edit daily txn
router.patch("/edit/:id", verifyToken, verifyAdmin, editDailyTransaction);

export default router;
