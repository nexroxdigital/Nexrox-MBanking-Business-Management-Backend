import mongoose from "mongoose";
import Bank from "../models/bank.js";
import BankTxn from "../models/bankTxn.js";
import Transaction from "../models/transaction.js";

// Create a new bank entry
export const addNewBank = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { bank, branch, routingNo, accountName, accountNumber, balance } =
      req.body;

    // Basic validation
    if (!bank || !branch || !accountName || !accountNumber) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const newBank = new Bank({
      bank,
      branch,
      routingNo,
      accountName,
      accountNumber,
      balance: balance || 0,
    });

    await newBank.save({ session });

    const txn = new Transaction({
      type: "create bank",
      note: "নতুন ব্যাংক যুক্ত করা হয়েছে",
      amount: null,
      profit: null,
      due: null,
    });

    await txn.save({ session });

    //  Commit transaction
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: "Bank saved successfully",
      data: newBank,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    res.status(400).json({
      message: "Error saving bank",
      error: error.message,
    });
  }
};

// Get all banks
export const getBanks = async (req, res) => {
  try {
    const banks = await Bank.find();

    res.status(200).json({
      message: "Banks fetched successfully",
      data: banks,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching banks",
      error: error.message,
    });
  }
};

// Delete a bank by ID
export const deleteBank = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedBank = await Bank.findByIdAndDelete(id);

    if (!deletedBank) {
      return res.status(404).json({ message: "Bank not found" });
    }

    res.status(200).json({
      message: "Bank deleted successfully",
      data: deletedBank,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting bank",
      error: error.message,
    });
  }
};

// Update a bank by ID
export const updateBank = async (req, res) => {
  try {
    const { id } = req.params;
    const { bank, branch, routingNo, accountName, accountNumber, balance } =
      req.body;

    const updatedBank = await Bank.findByIdAndUpdate(
      id,
      { bank, branch, routingNo, accountName, accountNumber, balance },
      { new: true, runValidators: true }
    );

    if (!updatedBank) {
      return res.status(404).json({ message: "Bank not found" });
    }

    res.status(200).json({
      message: "Bank updated successfully",
      data: updatedBank,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating bank",
      error: error.message,
    });
  }
};

// Adjust (increase or decrease) bank balance with validation
export const adjustBankBalance = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { amount } = req.body; // positive = deposit, negative = withdraw

    if (amount === undefined || typeof amount !== "number") {
      return res.status(400).json({ message: "Amount must be a number" });
    }

    // Find bank first
    const bank = await Bank.findById(id);
    if (!bank) {
      return res.status(404).json({ message: "Bank not found" });
    }

    const newBalance = bank.balance + amount;

    // Prevent negative balances
    if (newBalance < 0) {
      return res.status(400).json({ message: "Insufficient balance in bank" });
    }

    // Update balance
    bank.balance = newBalance;
    await bank.save({ session });

    const txn = new Transaction({
      type: "bank",
      note: "ব্যাংক ব্যালেন্স আপডেট করা হয়েছে",
      amount: amount,
      profit: null,
      due: null,
    });
    await txn.save({ session });

    //  Commit transaction
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: "Bank balance adjusted successfully",
      data: bank,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    res.status(500).json({
      message: "Error adjusting bank balance",
      error: error.message,
    });
  }
};

export const createBankTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      date,
      time,
      bank,
      branch = "",
      senderName,
      senderAccount,
      receiverName,
      receiverAccount,
      amount,
      fee,
      pay,
    } = req.body;

    // Validation
    if (!bank || !senderName || !receiverName || !amount) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Find the bank account
    const bankDoc = await Bank.findOne({
      accountNumber: senderAccount,
    }).session(session);

    if (!bankDoc) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "অকাউন্ট পাওয়া যায়নি" });
    }

    // Calculate deduction
    let deduction = 0;
    if (pay) {
      deduction = pay;
    } else if (fee) {
      deduction = amount + fee;
    } else {
      deduction = amount;
    }

    // Check balance
    if (bankDoc.balance < deduction) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ message: "ব্যাংক অকাউন্টে পর্যাপ্ত ব্যালেন্স নেই" });
    }

    //  Subtract from bank balance
    bankDoc.balance -= deduction;
    await bankDoc.save({ session });

    //  Save transaction
    const txn = new BankTxn({
      date,
      time,
      bank,
      branch,
      senderName,
      senderAccount,
      receiverName,
      receiverAccount,
      amount,
      fee,
      pay,
    });

    await txn.save({ session });

    // Save into Transaction collection also
    const generalTxn = new Transaction({
      type: "bank",
      amount,
      note: `${amount} টাকা পাঠানো হয়েছে ${receiverName} কে`,
      meta: {
        bank,
        branch,
        senderName,
        senderAccount,
        receiverName,
        receiverAccount,
        fee,
        pay,
        bankTxnId: txn._id,
      },
    });

    await generalTxn.save({ session });

    //  Commit transaction
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: "Transaction created and bank balance updated successfully",
      transaction: txn,
      updatedBank: bankDoc,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({
      message: "Error creating bank transaction",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

export const getBankTransactions = async (req, res) => {
  try {
    let { page = 1, limit = 10 } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const skip = (page - 1) * limit;

    //  Fetch paginated transactions
    const transactions = await BankTxn.find()
      .sort({ createdAt: -1 }) // latest first
      .skip(skip)
      .limit(limit);

    //  Count total for pagination
    const total = await BankTxn.countDocuments();

    res.status(200).json({
      message: "Bank transactions fetched successfully",
      data: transactions,
      pagination: {
        total,
        page,
        totalPages: Math.ceil(total / limit),
        limit,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching bank transactions",
      error: error.message,
    });
  }
};
