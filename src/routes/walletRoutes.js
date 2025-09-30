import express from "express";
import {
  createWalletNumber,
  getWalletNumbers,
} from "../controllers/walletController.js";

const router = express.Router();

// POST: create a wallet number
router.post("/create", createWalletNumber);
router.get("/", getWalletNumbers);

export default router;
