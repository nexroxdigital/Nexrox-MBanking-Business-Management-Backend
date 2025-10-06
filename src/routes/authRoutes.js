import express from "express";
import { loginUser, updateUserImage } from "../controllers/authController.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// POST /api/auth/login
router.post("/login", loginUser);

// update user image
router.patch("/update-image", verifyToken, verifyAdmin, updateUserImage);

export default router;
