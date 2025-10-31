import express from "express";
import {
  loginUser,
  registerUser,
  updateUserCredentials,
  updateUserImage,
} from "../controllers/authController.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// POST /api/auth/login
router.post("/login", loginUser);

// temp
router.post("/register", registerUser);

// update user image
router.patch("/update-image", verifyToken, verifyAdmin, updateUserImage);

// update user credentials
router.patch("/update-credentials", verifyToken, updateUserCredentials);

export default router;
