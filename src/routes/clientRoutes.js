import express from "express";
import {
  addNewClient,
  deleteClient,
  getClients,
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

export default router;
