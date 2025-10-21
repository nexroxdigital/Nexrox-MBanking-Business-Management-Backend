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
      senderName,
      senderBank,
      senderBranch,
      senderAccount,

      receiverName,
      receiverBank,
      receiverBranch,
      receiverAccount,
      method,
      amount,
      fee,
      pay,
      type = "send",
    } = req.body;

    console.log(req.body);

    const amountNum = Number(amount) || 0;
    const feeNum = Number(fee) || 0;
    const payNum = Number(pay) || 0;

    // Validation
    if (
      !senderBank ||
      !senderName ||
      !receiverName ||
      !receiverBank ||
      !amount
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    let bankDoc;
    let balanceChange = 0;
    let transactionNote = "";

    // ============ SEND MONEY LOGIC ============
    if (type === "send") {
      // Find sender's bank account (your account)
      bankDoc = await Bank.findOne({
        accountNumber: senderAccount,
      }).session(session);

      if (!bankDoc) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(404)
          .json({ message: "প্রেরকের অকাউন্ট পাওয়া যায়নি" });
      }

      // Calculate deduction
      if (payNum) {
        balanceChange = -payNum; // Subtract pay amount
      } else if (feeNum) {
        balanceChange = -(amountNum + feeNum); // Subtract amount + fee
      } else {
        balanceChange = -amountNum; // Subtract amount only
      }

      // Check if sufficient balance
      if (bankDoc.balance < Math.abs(balanceChange)) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json({ message: "ব্যাংক অকাউন্টে পর্যাপ্ত ব্যালেন্স নেই" });
      }

      transactionNote = `${amount} টাকা পাঠানো হয়েছে ${receiverName} কে`;
    }
    // ============ RECEIVE MONEY LOGIC ============
    else if (type === "receive") {
      // Find receiver's bank account (your account)
      bankDoc = await Bank.findOne({
        accountNumber: receiverAccount,
      }).session(session);

      if (!bankDoc) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(404)
          .json({ message: "গ্রাহকের আকাউন্ট পাওয়া যায়নি" });
      }

      // Calculate addition
      if (payNum) {
        balanceChange = payNum; // Add pay amount
      } else if (feeNum) {
        balanceChange = amountNum - feeNum;
      } else {
        balanceChange = amountNum; // Add full amount
      }

      transactionNote = `${amount} টাকা গ্রহণ করা হয়েছে ${senderName} থেকে`;
    }
    // ============ INVALID TYPE ============
    else {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Invalid transaction type" });
    }

    // Update bank balance
    bankDoc.balance += balanceChange;
    await bankDoc.save({ session });

    // Save bank transaction
    const txn = new BankTxn({
      date,
      time,
      senderName,
      senderBank,
      senderBranch,
      senderAccount,
      receiverName,
      receiverBank,
      receiverBranch,
      receiverAccount,
      method,
      amount: amountNum,
      fee: feeNum,
      pay: payNum,
      type,
    });

    await txn.save({ session });

    // Save into general Transaction collection
    const generalTxn = new Transaction({
      type: "bank",
      amount,
      note: transactionNote,
      meta: {
        senderName,
        senderBank,
        senderBranch,
        senderAccount,
        receiverName,
        receiverBank,
        receiverBranch,
        receiverAccount,
        fee,
        pay,
        transactionType: type,
        bankTxnId: txn._id,
      },
    });

    await generalTxn.save({ session });

    // Commit transaction
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

// delete bank transaction
export const deleteBankTxn = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    const { id } = req.params;

    console.log(id);

    // Find the bank transaction
    const bankTxn = await BankTxn.findById(id).session(session);
    // console.log(bankTxn);

    if (!bankTxn) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "লেনদেন পাওয়া যায়নি" });
    }

    // Find the bank account
    const bankDoc = await Bank.findOne({
      accountNumber:
        bankTxn.type === "send"
          ? bankTxn.senderAccount
          : bankTxn.receiverAccount,
    }).session(session);

    if (!bankDoc) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "ব্যাংক অকাউন্ট পাওয়া যায়নি" });
    }

    // Calculate the amount to restore (same logic as deduction in create)

    const amountNum = Number(bankTxn.amount) || 0;
    const feeNum = Number(bankTxn.fee) || 0;
    const payNum = Number(bankTxn.pay) || 0;

    let balanceChange = 0;

    // ============ SEND MONEY DELETE LOGIC ============
    if (bankTxn.type === "send") {
      if (payNum) {
        balanceChange = +payNum; // Add back pay
      } else if (feeNum) {
        balanceChange = +(amountNum + feeNum); // Add back amount + fee
      } else {
        balanceChange = +amountNum; // Add back amount only
      }
    }

    // ============ RECEIVE MONEY DELETE LOGIC ============
    else if (bankTxn.type === "receive") {
      if (payNum) {
        balanceChange = -payNum; // Subtract received pay
      } else if (feeNum) {
        balanceChange = -(amountNum - feeNum); // Subtract amount - fee
      } else {
        balanceChange = -amountNum; // Subtract full amount
      }
    }

    // Restore the bank balance
    bankDoc.balance += balanceChange;
    await bankDoc.save({ session });

    // Delete the related general Transaction record
    const deletedGeneralTxn = await Transaction.findOneAndDelete(
      { "meta.bankTxnId": bankTxn._id },
      { session }
    );

    // Delete the bank transaction
    await BankTxn.findByIdAndDelete(id).session(session);

    // Commit transaction
    await session.commitTransaction();

    console.log("data deelted");

    res.status(200).json({
      message:
        "লেনদেন সফলভাবে মুছে ফেলা হয়েছে এবং ব্যাংক ব্যালেন্স পুনরুদ্ধার করা হয়েছে",
      deletedBankTxn: bankTxn,
      restoredAmount: balanceChange,
      updatedBank: bankDoc,
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    res.status(500).json({
      message: "লেনদেন মুছতে সমস্যা হয়েছে",
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};

// edit bank transaction

export const editBankTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id: txnId } = req.params;
    const updates = req.body;

    console.log("Editing transaction:", req.body);

    // 1️⃣ Find the original transaction
    const originalTxn = await BankTxn.findById(txnId).session(session);
    if (!originalTxn) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Transaction not found" });
    }

    // Determine transaction type (use updated type or keep original)
    const transactionType = updates.type || originalTxn.type;

    // 2️⃣ REVERSE THE ORIGINAL TRANSACTION
    const originalAmountNum = Number(originalTxn.amount) || 0;
    const originalFeeNum = Number(originalTxn.fee) || 0;
    const originalPayNum = Number(originalTxn.pay) || 0;

    let originalBalanceChange = 0;

    // Reverse the original transaction based on its type
    if (originalTxn.type === "send") {
      if (originalPayNum) {
        originalBalanceChange = +originalPayNum; // Add back pay
      } else if (originalFeeNum) {
        originalBalanceChange = +(originalAmountNum + originalFeeNum); // Add back amount + fee
      } else {
        originalBalanceChange = +originalAmountNum; // Add back amount only
      }
    } else if (originalTxn.type === "receive") {
      if (originalPayNum) {
        originalBalanceChange = -originalPayNum; // Subtract received pay
      } else if (originalFeeNum) {
        originalBalanceChange = -(originalAmountNum - originalFeeNum); // Subtract amount - fee
      } else {
        originalBalanceChange = -originalAmountNum; // Subtract full amount
      }
    }

    // Find original bank account based on original transaction type
    const originalAccountNumber =
      originalTxn.type === "send"
        ? originalTxn.senderAccount
        : originalTxn.receiverAccount;

    const oldBankDoc = await Bank.findOne({
      accountNumber: originalAccountNumber,
    }).session(session);

    if (!oldBankDoc) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ message: "Original bank account not found" });
    }

    // Reverse original transaction from OLD bank
    oldBankDoc.balance += originalBalanceChange;
    await oldBankDoc.save({ session });

    // 3️⃣ APPLY THE UPDATED TRANSACTION
    const newAmount = Number(updates.amount ?? originalTxn.amount) || 0;
    const newFee = Number(updates.fee ?? originalTxn.fee) || 0;
    const newPay = Number(updates.pay ?? originalTxn.pay) || 0;

    let newBalanceChange = 0;
    let transactionNote = "";

    // Determine which bank account to use for UPDATED transaction
    let newAccountNumber;
    if (transactionType === "send") {
      newAccountNumber = updates.senderAccount || originalTxn.senderAccount;
      transactionNote = `${newAmount} টাকা পাঠানো হয়েছে ${
        updates.receiverName || originalTxn.receiverName
      } কে`;
    } else {
      newAccountNumber = updates.receiverAccount || originalTxn.receiverAccount;
      transactionNote = `${newAmount} টাকা গ্রহণ করা হয়েছে ${
        updates.senderName || originalTxn.senderName
      } থেকে`;
    }

    // Calculate new balance change based on UPDATED transaction type
    if (transactionType === "send") {
      if (newPay) {
        newBalanceChange = -newPay;
      } else if (newFee) {
        newBalanceChange = -(newAmount + newFee);
      } else {
        newBalanceChange = -newAmount;
      }
    } else {
      if (newPay) {
        newBalanceChange = newPay;
      } else if (newFee) {
        newBalanceChange = newAmount - newFee;
      } else {
        newBalanceChange = newAmount;
      }
    }

    // Find the NEW bank account for updated transaction
    let newBankDoc;
    if (newAccountNumber === originalAccountNumber) {
      // Same bank account
      newBankDoc = oldBankDoc;
    } else {
      // Different bank account - find the new one
      newBankDoc = await Bank.findOne({
        accountNumber: newAccountNumber,
      }).session(session);

      if (!newBankDoc) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ message: "New bank account not found" });
      }
    }

    // Check if sufficient balance for send transactions
    if (
      transactionType === "send" &&
      newBankDoc.balance < Math.abs(newBalanceChange)
    ) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ message: "Insufficient balance in bank account" });
    }

    // Apply new transaction to NEW bank
    // If same account, this will correctly adjust the balance after the reversal
    newBankDoc.balance += newBalanceChange;
    await newBankDoc.save({ session });

    // 4️⃣ UPDATE THE BANK TRANSACTION
    const updateFields = {
      date: updates.date || originalTxn.date,
      time: updates.time || originalTxn.time,
      senderName: updates.senderName || originalTxn.senderName,
      senderBank: updates.senderBank || originalTxn.senderBank,
      senderBranch: updates.senderBranch || originalTxn.senderBranch,
      senderAccount: updates.senderAccount || originalTxn.senderAccount,
      receiverName: updates.receiverName || originalTxn.receiverName,
      receiverBank: updates.receiverBank || originalTxn.receiverBank,
      receiverBranch: updates.receiverBranch || originalTxn.receiverBranch,
      receiverAccount: updates.receiverAccount || originalTxn.receiverAccount,
      method: updates.method || originalTxn.method,
      amount: newAmount,
      fee: newFee,
      pay: newPay,
      type: transactionType,
    };

    const updatedTxn = await BankTxn.findByIdAndUpdate(txnId, updateFields, {
      session,
      new: true,
    });

    // 5️⃣ UPDATE THE GENERAL TRANSACTION
    const generalTxn = await Transaction.findOne({
      "meta.bankTxnId": txnId,
    }).session(session);

    if (generalTxn) {
      generalTxn.amount = newAmount;
      generalTxn.note = transactionNote;
      generalTxn.meta = {
        ...generalTxn.meta,
        ...updateFields,
        bankTxnId: txnId,
      };

      await generalTxn.save({ session });
    }

    // 6️⃣ COMMIT TRANSACTION
    await session.commitTransaction();
    await session.endSession();

    // Prepare response
    const response = {
      message: "Transaction updated successfully",
      updatedTransaction: updatedTxn,
      bankUpdates: {
        transactionType,
        originalAccount: {
          accountNumber: originalAccountNumber,
          balance: oldBankDoc.balance,
        },
        updatedAccount: {
          accountNumber: newAccountNumber,
          balance: newBankDoc.balance,
        },
      },
    };

    // If bank account changed, include both old and new
    if (newAccountNumber !== originalAccountNumber) {
      response.bankUpdates.oldAccount = {
        accountNumber: originalAccountNumber,
        balance: oldBankDoc.balance,
      };
    }

    res.status(200).json(response);
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();
    res.status(500).json({
      message: "Error updating bank transaction",
      error: error.message,
    });
  }
};
