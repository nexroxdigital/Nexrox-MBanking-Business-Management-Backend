import mongoose from "mongoose";
import Client from "../models/client.js";
import DailyTransaction from "../models/dailyTransaction.js";
import WalletNumber from "../models/walletNumber.js";
import { sendSMS } from "../utils/smsService.js";

export const createDailyTransaction = async (req, res) => {
  console.log("full body", req.body);
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      date,
      channel,
      wallet_id,
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

    //  1. Handle Wallet update
    let walletDoc = null;
    if (wallet_id) {
      walletDoc = await WalletNumber.findById(wallet_id).session(session);
      if (!walletDoc) {
        throw new Error("Wallet not found");
      }

      if (type === "Cash Out") {
        walletDoc.balance += amount;
      } else if (type === "Cash In") {
        walletDoc.balance -= total || amount;
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
    }

    //  3. Save DailyTransaction
    const dailyTxn = new DailyTransaction({
      date,
      channel,
      wallet_id,
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
    });

    await dailyTxn.save({ session });

    // 4. Save Transaction
    let clientNumber = clientDoc ? clientDoc.phone : null;
    let walletNumber = walletDoc ? walletDoc.number : null;

    let shortNote = "";

    if (note) {
      shortNote = note;
    } else if (bill_type) {
      shortNote = `${total} টাকা ${bill_type} করা হয়েছে`;
    } else if (type === "Cash Out") {
      shortNote = `${amount} টাকা ${type} করা হয়েছে এই নাম্বারে ${walletNumber}`;
    } else {
      shortNote = `${total} টাকা ${type} করা হয়েছে এই নাম্বারে ${walletNumber}`;
    }

    const txn = new Transaction({
      type,
      client: client_id || null,
      clientNumber,
      amount,
      profit,
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
      .populate("client_id", "name phone") // if you want client info
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
