import cors from "cors";
import dotenv from "dotenv";
import express from "express";

import connectDB from "./config/db.js";

// routes
import bankRoutes from "./routes/bankRoutes.js";
import clientRoutes from "./routes/clientRoutes.js";
import operatorRoutes from "./routes/operatorRoutes.js";
import testRoutes from "./routes/testRoutes.js";
import walletRoutes from "./routes/walletRoutes.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to DB
connectDB();

// Routes for articles
app.use("/api/v1", testRoutes);

// Routes for wallet
app.use("/api/wallet", walletRoutes);
app.use("/api/operator", operatorRoutes);
app.use("/api/bank", bankRoutes);
app.use("/api/client", clientRoutes);

// Basic route
app.get("/", (req, res) => {
  res.json({ message: "Server  is running" });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
