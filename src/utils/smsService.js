// utils/smsService.js
import axios from "axios";

export const sendSMS = async (number, message) => {
  try {
    const apiKey = process.env.BULKSMS_API_KEY;
    const callerID = process.env.BULKSMS_CALLER_ID;

    const url = "https://bulksmsdhaka.com/api/sendtext";

    const payload = {
      apikey: apiKey,
      number,
      message,
      callerID,
    };

    const response = await axios.post(url, payload, {
      headers: { "Content-Type": "application/json" },
    });

    // console.log(response.data);

    return response.data;
  } catch (error) {
    console.error("SMS send failed:", error.message);
    throw new Error("Failed to send SMS");
  }
};
