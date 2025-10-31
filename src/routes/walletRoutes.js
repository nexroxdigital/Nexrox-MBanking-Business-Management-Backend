import express from "express";
import {
  addWalletBalance,
  createWalletNumber,
  deleteWalletNumber,
  editWalletNumber,
  getTotalWalletBalance,
  getWalletNumbers,
} from "../controllers/walletController.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// POST: create a wallet number
router.post("/create", verifyToken, verifyAdmin, createWalletNumber);

// GET: get all wallet numbers
router.get("/", verifyToken, verifyAdmin, getWalletNumbers);

// get total balance
router.get("/total-balance", getTotalWalletBalance);

// DELETE: remove a wallet number by ID
router.delete("/delete/:id", verifyToken, verifyAdmin, deleteWalletNumber);

// PUT: edit a wallet number by ID
router.put("/edit/:id", verifyToken, verifyAdmin, editWalletNumber);

// PATCH: adjust balance of a wallet number (increase or decrease)
router.patch("/add-balance/:id", verifyToken, verifyAdmin, addWalletBalance);

export default router;
