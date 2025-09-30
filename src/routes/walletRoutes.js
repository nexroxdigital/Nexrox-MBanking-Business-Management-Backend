import express from "express";
import { createWalletNumber } from "../controllers/walletController.js";

const router = express.Router();

// POST: create a wallet number
router.post("/create", createWalletNumber);

export default router;
