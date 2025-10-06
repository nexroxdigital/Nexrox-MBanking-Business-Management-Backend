import express from "express";
import {
  addNewBank,
  adjustBankBalance,
  createBankTransaction,
  deleteBank,
  getBanks,
  getBankTransactions,
  updateBank,
} from "../controllers/bankController.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// POST: create a new bank
router.post("/add", verifyToken, verifyAdmin, addNewBank);

// GET: fetch all banks
router.get("/", verifyToken, verifyAdmin, getBanks);

// DELETE: remove a bank by ID
router.delete("/delete/:id", verifyToken, verifyAdmin, deleteBank);

// PUT: update a bank by ID
router.put("/update/:id", verifyToken, verifyAdmin, updateBank);

// PATCH: adjust bank balance (increase or decrease)
router.patch(
  "/adjust-balance/:id",
  verifyToken,
  verifyAdmin,
  adjustBankBalance
);

// POST: Create a new bank transaction
router.post(
  "/create-transaction",
  verifyToken,
  verifyAdmin,
  createBankTransaction
);

// Get all bank transactions (with pagination)
router.get("/transactions", verifyToken, verifyAdmin, getBankTransactions);

export default router;
