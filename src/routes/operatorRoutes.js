import express from "express";
import { createOperator } from "../controllers/operatorController.js";

const router = express.Router();

// POST: create a new operator
router.post("/create", createOperator);

export default router;
