import express from "express";
import { createTest } from "../controllers/testControllers.js";

const router = express.Router();

router.post("/tests", createTest);

export default router;
