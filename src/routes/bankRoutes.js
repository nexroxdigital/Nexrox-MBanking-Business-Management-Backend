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

const router = express.Router();

// POST: create a new bank
router.post("/add", addNewBank);

// GET: fetch all banks
router.get("/", getBanks);

// DELETE: remove a bank by ID
router.delete("/delete/:id", deleteBank);

// PUT: update a bank by ID
router.put("/update/:id", updateBank);

// PATCH: adjust bank balance (increase or decrease)
router.patch("/adjust-balance/:id", adjustBankBalance);

// POST: Create a new bank transaction
router.post("/create-transaction", createBankTransaction);

// Get all bank transactions (with pagination)
router.get("/transactions", getBankTransactions);

export default router;
