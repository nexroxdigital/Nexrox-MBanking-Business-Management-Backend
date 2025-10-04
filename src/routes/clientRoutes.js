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

const router = express.Router();

// POST: create a new client
router.post("/add", addNewClient);

// GET: fetch all clients with pagination
router.get("/", getClients);

// DELETE: remove a client by ID
router.delete("/delete/:id", deleteClient);

// PUT: update a client (only name & phone)
router.patch("/update/:id", updateClient);

// PATCH: adjust client payment (paid & due)
router.patch("/adjust-payment/:id", adjustClientPayment);

// Get all transactions for a client
router.get("/transaction/:id", getTransactionsByClient);

// get all clients with infinity scrolling
router.get("/select", getClientsSelect);

export default router;
