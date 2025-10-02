// routes/smsRoutes.js
import express from "express";
import { sendSMS } from "../utils/smsService.js";

const router = express.Router();

router.post("/test-send", async (req, res) => {
  try {
    const { number, message } = req.body;
    const result = await sendSMS(number, message);
    res.status(200).json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
