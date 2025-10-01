import express from "express";
import {
  adjustOperatorBalance,
  createOperator,
  createRecharge,
  deleteOperator,
  getOperators,
  getRechargeRecords,
  updateOperator,
} from "../controllers/operatorController.js";

const router = express.Router();

// POST: create a new operator
router.post("/create", createOperator);

// GET: fetch all operators
router.get("/", getOperators);

// DELETE: remove an operator by ID
router.delete("/delete/:id", deleteOperator);

// PUT: update an operator by ID
router.put("/update/:id", updateOperator);

// PATCH: adjust operator balance (increase or decrease)
router.patch("/adjust-balance/:id", adjustOperatorBalance);

// recharge routes
// POST: create a recharge history entry
router.post("/create-recharge", createRecharge);

// GET: fetch all recharge history entries
router.get("/recharge-records", getRechargeRecords);

export default router;
