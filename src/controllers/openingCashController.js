import mongoose from "mongoose";
import OpeningCash from "../models/openingCash.js";
import Transaction from "../models/transaction.js";

// Get today's opening cash

// Backend - getTodayOpeningCash controller
export const getTodayOpeningCash = async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const opening = await OpeningCash.findOne({ date: today });

    if (!opening) {
      return res.json({
        success: true,
        data: {
          amount: 0,
          denominations: null,
        },
      });
    }

    res.json({
      success: true,
      data: {
        amount: opening.amount,
        denominations: opening.denominations,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const setOpeningCash = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const today = new Date().toISOString().split("T")[0];
    const { amount, denominations } = req.body; // Get denominations from request

    let opening = await OpeningCash.findOneAndUpdate(
      { date: today },
      {
        amount,
        denominations: denominations || [], // Save denominations breakdown
      },
      { new: true, upsert: true, session }
    );

    const txn = new Transaction({
      type: "bank",
      note: "opening ক্যাশ আপডেট করা হয়েছে",
      amount: amount,
      profit: null,
      due: null,
    });

    await txn.save({ session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    res.json({ success: true, data: opening });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    res.status(500).json({ success: false, message: err.message });
  }
};
