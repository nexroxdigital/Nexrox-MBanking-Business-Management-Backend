import express from "express";
import {
  adjustOperatorBalance,
  createOperator,
  createRecharge,
  deleteOperator,
  deleteRechargeTxn,
  editRechargeTransaction,
  getOperators,
  getRechargeRecords,
  updateOperator,
} from "../controllers/operatorController.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// POST: create a new operator
router.post("/create", verifyToken, verifyAdmin, createOperator);

// GET: fetch all operators
router.get("/", verifyToken, verifyAdmin, getOperators);

// DELETE: remove an operator by ID
router.delete("/delete/:id", verifyToken, verifyAdmin, deleteOperator);

// PUT: update an operator by ID
router.put("/update/:id", verifyToken, verifyAdmin, updateOperator);

// PATCH: adjust operator balance (increase or decrease)
router.patch(
  "/adjust-balance/:id",
  verifyToken,
  verifyAdmin,
  adjustOperatorBalance
);

// recharge routes
// POST: create a recharge history entry
router.post("/create-recharge", verifyToken, verifyAdmin, createRecharge);

// GET: fetch all recharge history entries
router.get("/recharge-records", verifyToken, verifyAdmin, getRechargeRecords);

// delete recharge transactions
router.delete(
  "/delete-recharge/:id",
  verifyToken,
  verifyAdmin,
  deleteRechargeTxn
);

// edit and update recharge txn
router.put(
  "/update-recharge/:id",
  verifyToken,
  verifyAdmin,
  editRechargeTransaction
);

export default router;
