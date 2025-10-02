// utils/smsService.js
import axios from "axios";

export const sendSMS = async (number, message) => {
  try {
    const apiKey = process.env.BULKSMS_API_KEY;
    const senderId = process.env.BULKSMS_SENDER_ID;

    const url = `http://bulksmsbd.net/api/smsapi?api_key=${apiKey}&type=text&number=${number}&senderid=${senderId}&message=${encodeURIComponent(
      message
    )}`;

    const response = await axios.get(url);
    // ✅ log provider response for debugging
    console.log("SMS API Response:", response.data);

    return response.data; // return provider response
  } catch (error) {
    console.error("SMS send failed:", error.message);
    throw new Error("Failed to send SMS");
  }
};
