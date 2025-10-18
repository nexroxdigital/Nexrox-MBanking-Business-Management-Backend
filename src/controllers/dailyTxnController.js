import mongoose from "mongoose";
import Client from "../models/client.js";
import DailyTransaction from "../models/dailyTransaction.js";
import Transaction from "../models/transaction.js";
import WalletNumber from "../models/walletNumber.js";
import { sendSMS } from "../utils/smsService.js";

export const createDailyTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      date,
      channel,
      wallet_id,
      txn_id,
      client_id,
      client_name,
      number,
      type,
      amount,
      fee,
      cost,
      total,
      profit,
      refund,
      due,
      note,
      bill_type,
      isSendMessage,
      message,
    } = req.body;

    console.log(req.body);

    //  1. Handle Wallet update
    let walletDoc = null;
    if (wallet_id) {
      walletDoc = await WalletNumber.findById(wallet_id).session(session);

      if (!walletDoc) {
        throw new Error("Wallet not found");
      }

      if (type === "Cash Out") {
        walletDoc.balance += total;
      } else if (type === "Cash In") {
        const deduction = amount;

        if (walletDoc.balance < deduction) {
          throw new Error("insufficient wallet balance");
        }

        walletDoc.balance -= deduction;
        walletDoc.balance += profit;
      } else if (type.toLowerCase() === "receive money") {
        walletDoc.balance += total;
      } else if (type.toLowerCase() === "send money") {
        walletDoc.balance -= amount;
        walletDoc.balance += profit;
      }

      await walletDoc.save({ session });
    }

    //  2. Handle Client update
    let clientDoc = null;
    if (client_id) {
      clientDoc = await Client.findById(client_id).session(session);
      if (!clientDoc) {
        throw new Error("Client not found");
      }

      if (due > 0) {
        // Increase totalSale by total
        clientDoc.totalSale += total;

        // Increase paid by (total - newDue)
        clientDoc.paid += total - due;

        // Increase due by new due
        clientDoc.due += due;

        await clientDoc.save({ session });
      }
      if (type.toLowerCase() === "cash" && amount > 0) {
        clientDoc.totalSale += amount;

        clientDoc.due += amount;
        await clientDoc.save({ session });
      }
    }

    //  3. Save DailyTransaction
    const dailyTxn = new DailyTransaction({
      date,
      channel,
      wallet_id,
      txn_id,
      client_id,
      client_name,
      number,
      type,
      amount,
      fee,
      cost,
      total,
      profit,
      refund,
      due,
      note,
      bill_type,
      wallet_balance: walletDoc ? walletDoc.balance : null,
    });

    await dailyTxn.save({ session });

    // 4. Save Transaction
    let clientNumber = clientDoc ? clientDoc.phone : number || null;
    let walletNumber = walletDoc ? walletDoc.number : null;

    let shortNote = "";

    if (note) {
      shortNote = note;
    } else if (bill_type) {
      shortNote = `${total} টাকা ${bill_type} করা হয়েছে`;
    } else if (type === "Cash Out") {
      shortNote = `${amount} টাকা ${type} করা হয়েছে এই নাম্বারে ${walletNumber}`;
    } else if (type === "Cash In") {
      if (walletDoc?.type.toLowerCase() === "agent") {
        shortNote = `${walletDoc?.label} থেকে ${amount} টাকা cash in করা হয়েছে।`;
      } else {
        shortNote = `${amount} টাকা ${type} করা হয়েছে ${
          clientNumber ? `এই নাম্বারে ${clientNumber}` : ""
        }`;
      }
    } else if (type.toLowerCase() === "receive money") {
      shortNote = `${total} টাকা ${type} হয়েছে এই নাম্বারে ${walletNumber}`;
    } else if (type.toLowerCase() === "send money") {
      shortNote = `${amount} টাকা ${type} করা হয়েছে ${
        clientNumber ? `এই নাম্বারে ${clientNumber}` : ""
      }`;
    } else if (type.toLowerCase() === "cash") {
      shortNote = `৳{clientDoc?.name} কে ${amount} টাকা দেওয়া হয়েছে।`;
    }

    // let txnAmount = 0;
    // if (type === "Cash Out") txnAmount = total;
    // else if (type === "Cash In") txnAmount = amount;
    // else if (type.toLowerCase() === "receive money") txnAmount = total;
    // else if (type.toLowerCase() === "send money") txnAmount = amount;
    // else txnAmount = amount;

    const txn = new Transaction({
      type,
      client: client_id || null,
      clientNumber: clientNumber || null,
      amount: amount || 0,
      profit: profit || 0,
      due: due || 0,
      note: shortNote,
    });

    await txn.save({ session });

    //  5. Send SMS if needed
    if (isSendMessage && clientNumber) {
      const smsText = message && message.trim() !== "" ? message : shortNote;
      await sendSMS(clientNumber, smsText);
    }

    //  Commit transaction
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: "Daily transaction created successfully",
      data: { dailyTxn, walletDoc, clientDoc, txn },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    // handle specific business errors
    if (error.message === "insufficient wallet balance") {
      return res.status(400).json({
        message: "ওয়ালেটে পর্যাপ্ত ব্যালেন্স নেই",
        error: error.message,
      });
    }

    res.status(500).json({
      message: "Error creating daily transaction",
      error: error.message,
    });
  }
};

// get all transactions with pagination
export const getDailyTransactions = async (req, res) => {
  try {
    let { page = 1, limit = 10 } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const skip = (page - 1) * limit;

    // Fetch transactions with pagination
    const transactions = await DailyTransaction.find()
      .populate("client_id", "name phone")
      .populate("wallet_id", "label number channel type") // if you want client info
      .sort({ createdAt: -1 }) // latest first
      .skip(skip)
      .limit(limit);

    // Count total
    const totalTxns = await DailyTransaction.countDocuments();

    res.status(200).json({
      data: transactions,
      pagination: {
        total: totalTxns,
        page,
        limit,
        totalPages: Math.ceil(totalTxns / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching transactions",
      error: error.message,
    });
  }
};

export const getWalletWiseReport = async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    // Fetch today's transactions that have wallet_id
    const transactions = await DailyTransaction.find({
      date: today,
      wallet_id: { $exists: true, $ne: null },
    }).populate("wallet_id", "label number type");

    //  Group by wallet_id
    const reportMap = new Map();

    transactions.forEach((txn) => {
      // console.log("txn", typeof txn.total);
      const wallet = txn.wallet_id;
      if (!wallet) return;

      const walletId = wallet._id.toString();

      if (!reportMap.has(walletId)) {
        reportMap.set(walletId, {
          wallet: {
            _id: walletId,
            label: wallet.label,
            number: wallet.number,
            type: wallet.type,
          },
          txnCount: 0,
          totalTxnAmount: 0,
        });
      }

      const report = reportMap.get(walletId);

      // Count transactions
      report.txnCount += 1;

      // console.log("Wallet Type:", wallet.type);

      // Add amount based on wallet type
      if (wallet.type.toLowerCase() === "agent") {
        report.totalTxnAmount += txn.amount;
      } else if (wallet.type.toLowerCase() === "personal") {
        report.totalTxnAmount += txn.total || txn.amount;
      }

      reportMap.set(walletId, report);
    });

    // Convert map to array
    const result = Array.from(reportMap.values());

    // console.log(result);

    res.status(200).json({
      message: "Wallet-wise report for today",
      date: today,
      count: result.length,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error generating wallet report",
      error: error.message,
    });
  }
};
