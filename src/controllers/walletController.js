import WalletNumber from "../models/walletNumber.js";

// Create and save a new wallet number
export const createWalletNumber = async (req, res) => {
  try {
    const { label, number, channel, type } = req.body;

    // Clean validation loop
    const requiredFields = { label, number, channel, type };
    for (const [key, value] of Object.entries(requiredFields)) {
      if (!value || value.toString().trim() === "") {
        return res.status(400).json({ message: `${key} is required` });
      }
    }

    // Optional: check number is digits only
    if (!/^\d+$/.test(number)) {
      return res
        .status(400)
        .json({ message: "Number must contain only digits" });
    }

    const newWalletNumber = new WalletNumber({
      label,
      number,
      channel,
      type,
      balance: 0,
    });

    await newWalletNumber.save();

    res.status(201).json({
      message: "Wallet number created successfully",
      data: newWalletNumber,
    });
  } catch (error) {
    res.status(400).json({
      message: "Error creating wallet number",
      error: error.message,
    });
  }
};
