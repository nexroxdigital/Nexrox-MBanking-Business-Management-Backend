import express from "express";
import { getTransactions } from "../controllers/transactionController.js";

const router = express.Router();

//Get all transactions (infinite scroll style)
router.get("/", getTransactions);

export default router;
