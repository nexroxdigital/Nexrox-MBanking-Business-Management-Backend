import express from "express";
import {
  addNewClient,
  adjustClientPayment,
  deleteClient,
  getClients,
  getClientsSelect,
  getTransactionsByClient,
  updateClient,
} from "../controllers/clientController.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// POST: create a new client
router.post("/add", verifyToken, verifyAdmin, addNewClient);

// GET: fetch all clients with pagination
router.get("/", verifyToken, verifyAdmin, getClients);

// DELETE: remove a client by ID
router.delete("/delete/:id", verifyToken, verifyAdmin, deleteClient);

// PUT: update a client (only name & phone)
router.patch("/update/:id", verifyToken, verifyAdmin, updateClient);

// PATCH: adjust client payment (paid & due)
router.patch(
  "/adjust-payment/:id",
  verifyToken,
  verifyAdmin,
  adjustClientPayment
);

// Get all transactions for a client
router.get(
  "/transaction/:id",
  verifyToken,
  verifyAdmin,
  getTransactionsByClient
);

// get all clients with infinity scrolling
router.get("/select", verifyToken, verifyAdmin, getClientsSelect);

export default router;
