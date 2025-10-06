import mongoose from "mongoose";
import OpeningCash from "../models/openingCash.js";
import Transaction from "../models/transaction.js";

// Get today's opening cash
export const getTodayOpeningCash = async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    let opening = await OpeningCash.findOne({ date: today });

    // If not found, create new with 0 automatically
    if (!opening) {
      opening = await OpeningCash.create({ date: today, amount: 0 });
    }

    res.json({ success: true, data: opening });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Set or update today's opening cash
export const setOpeningCash = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const today = new Date().toISOString().split("T")[0];
    const { amount } = req.body;

    let opening = await OpeningCash.findOneAndUpdate(
      { date: today },
      { amount },
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

    //  Commit transaction
    await session.commitTransaction();
    session.endSession();

    res.json({ success: true, data: opening });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    res.status(500).json({ success: false, message: err.message });
  }
};
