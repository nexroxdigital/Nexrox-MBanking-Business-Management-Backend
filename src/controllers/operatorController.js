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

    const txn = new Transaction({
      type: "recharge",
      note: `এই ${receiverNumber} নম্বরে রিচার্জ করা হয়েছে`,
      amount: Number(rechargeAmount) || 0,
      profit: null,
      due: null,
    });

    await txn.save({ session });

    // Create recharge history with the updated balance
    const newRecharge = new RechargeTxn({
      date,
      senderNumber,
      receiverNumber,
      rechargeAmount,
      balance: operator.balance,
      operator: operator._id,
      transaction: txn._id,
    });

    await newRecharge.save({ session });

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

// delete recharge transaction
export const deleteRechargeTxn = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params; // recharge transaction id

    //  Validate input
    if (!id) {
      return res
        .status(400)
        .json({ message: "Recharge transaction ID is required" });
    }

    // 2 Find the recharge record (with session)
    const recharge = await RechargeTxn.findById(id).session(session);
    if (!recharge) {
      return res.status(404).json({ message: "Recharge record not found" });
    }

    // Find the related operator
    const operator = await Operator.findById(recharge.operator).session(
      session
    );
    if (!operator) {
      return res.status(404).json({ message: "Operator not found" });
    }

    //  Reverse the recharge effect on operator balance
    operator.balance += recharge.rechargeAmount;
    await operator.save({ session });

    //  Delete the related transaction
    if (recharge.transaction) {
      await Transaction.deleteOne({ _id: recharge.transaction }).session(
        session
      );
    }

    // 6Delete the recharge record itself
    await RechargeTxn.deleteOne({ _id: id }).session(session);

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: "Recharge transaction deleted successfully",
      deletedRechargeId: id,
    });
  } catch (error) {
    // Rollback on error
    await session.abortTransaction();
    session.endSession();

    res.status(400).json({
      message: "Error deleting recharge transaction",
      error: error.message,
    });
  }
};

export const editRechargeTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { date, senderNumber, receiverNumber, rechargeAmount } = req.body;

    // 1️⃣ Basic validation
    if (!date || !senderNumber || !receiverNumber || !rechargeAmount) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // 2️⃣ Find existing recharge transaction
    const rechargeTxn = await RechargeTxn.findById(id)
      .populate("operator")
      .session(session);

    if (!rechargeTxn) {
      return res
        .status(404)
        .json({ message: "Recharge transaction not found" });
    }

    // 3️⃣ Get the old operator
    const oldOperator = await Operator.findById(
      rechargeTxn.operator._id
    ).session(session);

    // 4️⃣ Reverse old recharge (refund)
    oldOperator.balance += rechargeTxn.rechargeAmount;
    await oldOperator.save({ session });

    // 5️⃣ Find new operator by senderNumber
    const newOperator = await Operator.findOne({
      number: senderNumber,
    }).session(session);

    // console.log("new ope", newOperator);

    if (!newOperator) {
      throw new Error("New operator not found");
    }

    // 6️⃣ Check balance before deduction
    if (newOperator.balance < rechargeAmount) {
      throw new Error("Insufficient operator balance for update");
    }

    // 7️⃣ Deduct new amount from new operator
    newOperator.balance -= rechargeAmount;
    await newOperator.save({ session });

    // 8️⃣ Update Recharge Transaction
    rechargeTxn.set({
      date,
      senderNumber,
      receiverNumber,
      rechargeAmount,
      balance: newOperator.balance,
      operator: newOperator._id,
      transaction: rechargeTxn.transaction,
    });

    await rechargeTxn.save({ session });

    // 9️⃣ Update related general Transaction
    const txn = await Transaction.findById(rechargeTxn.transaction).session(
      session
    );

    if (txn) {
      txn.amount = rechargeAmount;
      txn.note = `এই ${receiverNumber} নম্বরে রিচার্জ করা হয়েছে`;
      await txn.save({ session });
    }

    // 🔟 Commit transaction
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: "Recharge transaction updated successfully",
      data: rechargeTxn,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({
      message: "Error updating recharge transaction",
      error: error.message,
    });
  }
};
