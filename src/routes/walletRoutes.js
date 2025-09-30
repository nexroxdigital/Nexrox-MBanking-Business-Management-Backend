import express from "express";
import {
  addWalletBalance,
  createWalletNumber,
  deleteWalletNumber,
  editWalletNumber,
  getWalletNumbers,
} from "../controllers/walletController.js";

const router = express.Router();

// POST: create a wallet number
router.post("/create", createWalletNumber);

// GET: get all wallet numbers
router.get("/", getWalletNumbers);

// DELETE: remove a wallet number by ID
router.delete("/delete/:id", deleteWalletNumber);

// PUT: edit a wallet number by ID
router.put("/edit/:id", editWalletNumber);

// PATCH: adjust balance of a wallet number (increase or decrease)
router.patch("/add-balance/:id", addWalletBalance);

export default router;
