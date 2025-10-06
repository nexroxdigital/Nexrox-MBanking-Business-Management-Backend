import cors from "cors";
import dotenv from "dotenv";
import express from "express";

import connectDB from "./config/db.js";

// routes
import loginUser from "./routes/authRoutes.js";
import bankRoutes from "./routes/bankRoutes.js";
import clientRoutes from "./routes/clientRoutes.js";
import dailyTxnRoutes from "./routes/dailyTxnRoutes.js";
import openingCashRoutes from "./routes/openingCashRoutes.js";
import operatorRoutes from "./routes/operatorRoutes.js";
import sendMsg from "./routes/sendMsg.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import walletRoutes from "./routes/walletRoutes.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to DB
connectDB();

// Routes for wallet
app.use("/api/auth", loginUser);
app.use("/api/wallet", walletRoutes);
app.use("/api/operator", operatorRoutes);
app.use("/api/bank", bankRoutes);
app.use("/api/client", clientRoutes);
app.use("/api/sms", sendMsg);
app.use("/api/daily-txn", dailyTxnRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/opening-cash", openingCashRoutes);

// Basic route
app.get("/", (req, res) => {
  res.json({ message: "Server  is running" });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
