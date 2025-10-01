import express from "express";
import {
  addNewBank,
  adjustBankBalance,
  deleteBank,
  getBanks,
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

export default router;
