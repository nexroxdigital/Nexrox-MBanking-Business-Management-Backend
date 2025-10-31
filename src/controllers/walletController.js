import mongoose from "mongoose";
import Transaction from "../models/transaction.js";
import WalletNumber from "../models/walletNumber.js";

// Create and save a new wallet number
export const createWalletNumber = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

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

    await newWalletNumber.save({ session });

    const txn = new Transaction({
      type: "wallet",
      note: "নতুন ওয়ালেট যোগ করা হয়েছে",
      amount: null,
      profit: null,
      due: null,
    });

    await txn.save({ session });

    //  Commit transaction
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: "Wallet number created successfully",
      data: newWalletNumber,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    res.status(400).json({
      message: "Error creating wallet number",
      error: error.message,
    });
  }
};

// Get all wallet numbers
export const getWalletNumbers = async (req, res) => {
  try {
    const wallets = await WalletNumber.find();

    res.status(200).json({
      message: "Wallet numbers fetched successfully",
      data: wallets,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching wallet numbers",
      error: error.message,
    });
  }
};

// Delete a wallet number by ID
export const deleteWalletNumber = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedWallet = await WalletNumber.findByIdAndDelete(id);

    if (!deletedWallet) {
      return res.status(404).json({ message: "Wallet number not found" });
    }

    res.status(200).json({
      message: "Wallet number deleted successfully",
      data: deletedWallet,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting wallet number",
      error: error.message,
    });
  }
};

// Update a wallet number by ID
export const editWalletNumber = async (req, res) => {
  try {
    const { id } = req.params;
    const { label, number, channel, type, balance } = req.body;

    const updatedWallet = await WalletNumber.findByIdAndUpdate(
      id,
      { label, number, channel, type, balance },
      { new: true, runValidators: true } // return updated doc, respect schema rules
    );

    if (!updatedWallet) {
      return res.status(404).json({ message: "Wallet number not found" });
    }

    res.status(200).json({
      message: "Wallet number updated successfully",
      data: updatedWallet,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating wallet number",
      error: error.message,
    });
  }
};

// Adjust (increase or decrease) balance of a wallet number
export const addWalletBalance = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { amount } = req.body;

    if (amount === undefined || typeof amount !== "number") {
      return res.status(400).json({ message: "Amount must be a number" });
    }

    const updatedWallet = await WalletNumber.findByIdAndUpdate(
      id,
      { $inc: { balance: amount } },
      { new: true, runValidators: true, session }
    );

    if (!updatedWallet) {
      return res.status(404).json({ message: "Wallet number not found" });
    }

    const txn = new Transaction({
      type: "bank",
      note: "ওয়ালেট ব্যালেন্স আপডেট করা হয়েছে",
      amount: amount || 0,
      profit: null,
      due: null,
    });

    await txn.save({ session });

    //  Commit transaction
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: "Balance adjusted successfully",
      data: updatedWallet,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    res.status(500).json({
      message: "Error adjusting balance",
      error: error.message,
    });
  }
};

// Get total balance from all wallet numbers
export const getTotalWalletBalance = async (req, res) => {
  try {
    const result = await WalletNumber.aggregate([
      {
        $group: {
          _id: null,
          totalBalance: { $sum: "$balance" },
        },
      },
    ]);

    const totalBalance = result.length > 0 ? result[0].totalBalance : 0;

    res.status(200).json({
      message: "Total wallet balance fetched successfully",
      data: {
        totalBalance,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching total wallet balance",
      error: error.message,
    });
  }
};
