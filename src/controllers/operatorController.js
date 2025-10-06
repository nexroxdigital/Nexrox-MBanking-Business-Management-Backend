import mongoose from "mongoose";
import Operator from "../models/operatorModel.js";
import RechargeTxn from "../models/rechargeTxn.js";
import Transaction from "../models/transaction.js";

// Create a new operator
export const createOperator = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { name, number, balance } = req.body;

    // Basic validation
    if (!name || !number) {
      return res.status(400).json({ message: "Name and number are required" });
    }

    const newOperator = new Operator({
      name,
      number,
      balance: balance || 0,
    });

    await newOperator.save({ session });

    const txn = new Transaction({
      type: "operator add",
      note: "নতুন অপারেটর যোগ করা হয়েছে",
      amount: null,
      profit: null,
      due: null,
    });

    await txn.save({ session });

    //  Commit transaction
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: "Operator created successfully",
      data: newOperator,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    res.status(400).json({
      message: "Error creating operator",
      error: error.message,
    });
  }
};

// Get all operators
export const getOperators = async (req, res) => {
  try {
    const operators = await Operator.find();

    res.status(200).json({
      message: "Operators fetched successfully",
      data: operators,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching operators",
      error: error.message,
    });
  }
};

// Delete an operator by ID
export const deleteOperator = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedOperator = await Operator.findByIdAndDelete(id);

    if (!deletedOperator) {
      return res.status(404).json({ message: "Operator not found" });
    }

    res.status(200).json({
      message: "Operator deleted successfully",
      data: deletedOperator,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting operator",
      error: error.message,
    });
  }
};

// Update an operator by ID
export const updateOperator = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, number, balance } = req.body;

    const updatedOperator = await Operator.findByIdAndUpdate(
      id,
      { name, number, balance },
      { new: true, runValidators: true }
    );

    if (!updatedOperator) {
      return res.status(404).json({ message: "Operator not found" });
    }

    res.status(200).json({
      message: "Operator updated successfully",
      data: updatedOperator,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating operator",
      error: error.message,
    });
  }
};

// Adjust operator balance (increase or decrease)
export const adjustOperatorBalance = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { amount } = req.body; // positive = increase, negative = decrease

    if (amount === undefined || typeof amount !== "number") {
      return res.status(400).json({ message: "Amount must be a number" });
    }

    const updatedOperator = await Operator.findByIdAndUpdate(
      id,
      { $inc: { balance: amount } }, // increment or decrement balance
      { new: true, runValidators: true, session }
    );

    if (!updatedOperator) {
      return res.status(404).json({ message: "Operator not found" });
    }

    const txn = new Transaction({
      type: "bank",
      note: "অপারেটর ব্যালেন্স আপডেট করা হয়েছে",
      amount: amount,
      profit: null,
      due: null,
    });
    await txn.save({ session });

    //  Commit transaction
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: "Operator balance adjusted successfully",
      data: updatedOperator,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    res.status(500).json({
      message: "Error adjusting operator balance",
      error: error.message,
    });
  }
};

// Create a new recharge entry
export const createRecharge = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { date, senderNumber, receiverNumber, rechargeAmount } = req.body;

    // Basic validation
    if (!date || !senderNumber || !receiverNumber || !rechargeAmount) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Find the operator by senderNumber
    const operator = await Operator.findOne({ number: senderNumber }).session(
      session
    );

    if (!operator) {
      return res.status(404).json({ message: "Operator not found" });
    }

    // Check if operator has enough balance
    if (operator.balance < rechargeAmount) {
      return res.status(400).json({ message: "Insufficient operator balance" });
    }

    // Subtract recharge amount
    operator.balance -= rechargeAmount;
    await operator.save({ session });

    // Create recharge history with the updated balance
    const newRecharge = new RechargeTxn({
      date,
      senderNumber,
      receiverNumber,
      rechargeAmount,
      balance: operator.balance,
      operator: operator._id,
    });

    await newRecharge.save({ session });

    const txn = new Transaction({
      type: "recharge",
      note: `এই ${receiverNumber} নম্বরে রিচার্জ করা হয়েছে`,
      amount: Number(rechargeAmount) || 0,
      profit: null,
      due: null,
    });

    await txn.save({ session });

    //  Commit transaction
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: "Recharge history saved successfully",
      data: newRecharge,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    res.status(400).json({
      message: "Error saving recharge history",
      error: error.message,
    });
  }
};

export const getRechargeRecords = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // default page = 1
    const limit = parseInt(req.query.limit) || 10; // default rows = 10
    const skip = (page - 1) * limit;

    // Fetch paginated records
    const histories = await RechargeTxn.find()
      .populate("operator", "name number") // bring operator name + number
      .sort({ date: -1 }) // latest first
      .skip(skip)
      .limit(limit);

    // Count total documents for pagination
    const totalRecords = await RechargeTxn.countDocuments();

    res.status(200).json({
      message: "Recharge histories fetched successfully",
      data: histories,
      pagination: {
        total: totalRecords,
        page,
        limit,
        totalPages: Math.ceil(totalRecords / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching recharge histories",
      error: error.message,
    });
  }
};
