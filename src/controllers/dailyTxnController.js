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

    // console.log(req.body);

    // 1. Handle Wallet update
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
        if (
          type.toLowerCase() === "cash in" ||
          type.toLowerCase() === "send money"
        ) {
          clientDoc.totalSale += total;
          // Increase paid by (total - newDue)
          clientDoc.paid += total - due;
        } else if (
          type.toLowerCase() === "receive money" ||
          type.toLowerCase() === "cash out"
        ) {
          clientDoc.totalSale += amount;
          // Increase paid by (amount - newDue)
          clientDoc.paid += amount - due;
        }

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

    // 4. Save Transaction
    let clientNumber = clientDoc ? clientDoc.phone : number || null;
    let walletNumber = walletDoc ? walletDoc.number : null;

    let shortNote = "";

    if (note) {
      shortNote = note;
    } else if (bill_type) {
      shortNote = `${total} টাকা ${bill_type} করা হয়েছে`;
    } else if (type === "Cash Out") {
      if (walletDoc?.type.toLowerCase() === "agent") {
        shortNote = `${amount} টাকা ${type} করা হয়েছে ${walletDoc?.label} -এ`;
      } else {
        shortNote = `${amount} টাকা ${type} করা হয়েছে এই নাম্বারে ${walletNumber}`;
      }
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
      transaction_id: txn._id,
    });

    await dailyTxn.save({ session });

    // let txnAmount = 0;
    // if (type === "Cash Out") txnAmount = total;
    // else if (type === "Cash In") txnAmount = amount;
    // else if (type.toLowerCase() === "receive money") txnAmount = total;
    // else if (type.toLowerCase() === "send money") txnAmount = amount;
    // else txnAmount = amount;

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

// delete daily transaction history

export const deleteDailyTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    // 1. Find the daily transaction
    const dailyTxn = await DailyTransaction.findById(id).session(session);
    if (!dailyTxn) {
      return res.status(404).json({ message: "Daily transaction not found" });
    }

    // 2. Revert Wallet changes
    if (dailyTxn.wallet_id) {
      const wallet = await WalletNumber.findById(dailyTxn.wallet_id).session(
        session
      );
      if (wallet) {
        const type = dailyTxn.type.toLowerCase();

        if (type === "cash out") {
          wallet.balance -= dailyTxn.total;
        } else if (type === "cash in") {
          wallet.balance += dailyTxn.amount;
          wallet.balance -= dailyTxn.profit || 0;
        } else if (type === "receive money") {
          wallet.balance -= dailyTxn.total;
        } else if (type === "send money") {
          wallet.balance += dailyTxn.amount;
          wallet.balance -= dailyTxn.profit || 0;
        }

        await wallet.save({ session });
      }
    }

    // 3. Revert Client changes
    if (dailyTxn.client_id) {
      const client = await Client.findById(dailyTxn.client_id).session(session);
      if (client) {
        if (dailyTxn.due > 0) {
          client.totalSale -= dailyTxn.total || 0;
          client.paid -= dailyTxn.total - dailyTxn.due || 0;
          client.due -= dailyTxn.due || 0;
        }
        if (dailyTxn.type.toLowerCase() === "cash" && dailyTxn.amount > 0) {
          client.totalSale -= dailyTxn.amount;
          client.due -= dailyTxn.amount;
        }
        await client.save({ session });
      }
    }

    // 4. Delete linked general transaction
    if (dailyTxn.transaction_id) {
      await Transaction.findByIdAndDelete(dailyTxn.transaction_id).session(
        session
      );
    }

    // 5. Delete the daily transaction itself
    await DailyTransaction.findByIdAndDelete(id).session(session);

    // 6. Commit
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: "Daily transaction deleted successfully" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({
      message: "Error deleting daily transaction",
      error: error.message,
    });
  }
};

// edit daily transaction history

export const editDailyTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params; // Daily transaction ID to update
    const updateData = req.body;

    // Step 1: Fetch existing DailyTransaction with related docs
    const existingDailyTxn = await DailyTransaction.findById(id).session(
      session
    );
    if (!existingDailyTxn) {
      throw new Error("Daily transaction not found");
    }

    const existingTransaction = await Transaction.findById(
      existingDailyTxn.transaction_id
    ).session(session);

    // Store old values for reversal
    const oldData = {
      wallet_id: existingDailyTxn.wallet_id,
      client_id: existingDailyTxn.client_id,
      type: existingDailyTxn.type,
      amount: existingDailyTxn.amount,
      total: existingDailyTxn.total,
      profit: existingDailyTxn.profit,
      due: existingDailyTxn.due,
    };

    // Prepare new values (use existing if not provided)
    const newData = {
      date: updateData.date ?? existingDailyTxn.date,
      channel: updateData.channel ?? existingDailyTxn.channel,
      wallet_id: updateData.wallet_id ?? existingDailyTxn.wallet_id,
      txn_id: updateData.txn_id ?? existingDailyTxn.txn_id,
      client_id: updateData.client_id ?? existingDailyTxn.client_id,
      client_name: updateData.client_name ?? existingDailyTxn.client_name,
      number: updateData.number ?? existingDailyTxn.number,
      type: updateData.type ?? existingDailyTxn.type,
      amount: updateData.amount ?? existingDailyTxn.amount,
      fee: updateData.fee ?? existingDailyTxn.fee,
      cost: updateData.cost ?? existingDailyTxn.cost,
      total: updateData.total ?? existingDailyTxn.total,
      profit: updateData.profit ?? existingDailyTxn.profit,
      refund: updateData.refund ?? existingDailyTxn.refund,
      due: updateData.due ?? existingDailyTxn.due,
      note: updateData.note ?? existingDailyTxn.note,
      bill_type: updateData.bill_type ?? existingDailyTxn.bill_type,
      isSendMessage: updateData.isSendMessage,
      message: updateData.message,
    };

    // Step 2: Reverse old wallet effects
    if (oldData.wallet_id) {
      const oldWallet = await WalletNumber.findById(oldData.wallet_id).session(
        session
      );
      if (oldWallet) {
        if (oldData.type === "Cash Out") {
          oldWallet.balance -= oldData.total;
        } else if (oldData.type === "Cash In") {
          oldWallet.balance += oldData.amount;
          oldWallet.balance -= oldData.profit;
        } else if (oldData.type.toLowerCase() === "receive money") {
          oldWallet.balance -= oldData.total;
        } else if (oldData.type.toLowerCase() === "send money") {
          oldWallet.balance += oldData.amount;
          oldWallet.balance -= oldData.profit;
        }
        await oldWallet.save({ session });
      }
    }

    // Step 3: Reverse old client effects
    if (oldData.client_id) {
      const oldClient = await Client.findById(oldData.client_id).session(
        session
      );
      if (oldClient) {
        if (oldData.due > 0) {
          if (
            oldData.type.toLowerCase() === "cash in" ||
            oldData.type.toLowerCase() === "send money"
          ) {
            oldClient.totalSale -= oldData.total;
            oldClient.paid -= oldData.total - oldData.due;
          } else if (
            oldData.type.toLowerCase() === "receive money" ||
            oldData.type.toLowerCase() === "cash out"
          ) {
            oldClient.totalSale -= oldData.amount;
            oldClient.paid -= oldData.amount - oldData.due;
          }
          oldClient.due -= oldData.due;
        }
        if (oldData.type.toLowerCase() === "cash" && oldData.amount > 0) {
          oldClient.totalSale -= oldData.amount;
          oldClient.due -= oldData.amount;
        }
        await oldClient.save({ session });
      }
    }

    // Step 4: Apply new wallet effects
    let newWalletDoc = null;
    if (newData.wallet_id) {
      newWalletDoc = await WalletNumber.findById(newData.wallet_id).session(
        session
      );
      if (!newWalletDoc) {
        throw new Error("Wallet not found");
      }

      if (newData.type === "Cash Out") {
        newWalletDoc.balance += newData.total;
      } else if (newData.type === "Cash In") {
        const deduction = newData.amount;
        if (newWalletDoc.balance < deduction) {
          throw new Error("insufficient wallet balance");
        }
        newWalletDoc.balance -= deduction;
        newWalletDoc.balance += newData.profit;
      } else if (newData.type.toLowerCase() === "receive money") {
        newWalletDoc.balance += newData.total;
      } else if (newData.type.toLowerCase() === "send money") {
        newWalletDoc.balance -= newData.amount;
        newWalletDoc.balance += newData.profit;
      }

      await newWalletDoc.save({ session });
    }

    // Step 5: Apply new client effects
    let newClientDoc = null;
    if (newData.client_id) {
      newClientDoc = await Client.findById(newData.client_id).session(session);
      if (!newClientDoc) {
        throw new Error("Client not found");
      }

      if (newData.due > 0) {
        if (
          newData.type.toLowerCase() === "cash in" ||
          newData.type.toLowerCase() === "send money"
        ) {
          newClientDoc.totalSale += newData.total;
          newClientDoc.paid += newData.total - newData.due;
        } else if (
          newData.type.toLowerCase() === "receive money" ||
          newData.type.toLowerCase() === "cash out"
        ) {
          newClientDoc.totalSale += newData.amount;
          newClientDoc.paid += newData.amount - newData.due;
        }
        newClientDoc.due += newData.due;
      }
      if (newData.type.toLowerCase() === "cash" && newData.amount > 0) {
        newClientDoc.totalSale += newData.amount;
        newClientDoc.due += newData.amount;
      }

      await newClientDoc.save({ session });
    }

    // Step 6: Generate new short note
    let clientNumber = newClientDoc
      ? newClientDoc.phone
      : newData.number || null;
    let walletNumber = newWalletDoc ? newWalletDoc.number : null;

    let shortNote = "";
    if (newData.note) {
      shortNote = newData.note;
    } else if (newData.bill_type) {
      shortNote = `${newData.total} টাকা ${newData.bill_type} করা হয়েছে`;
    } else if (newData.type === "Cash Out") {
      shortNote = `${newData.amount} টাকা ${newData.type} করা হয়েছে এই নাম্বারে ${walletNumber}`;
    } else if (newData.type === "Cash In") {
      if (newWalletDoc?.type.toLowerCase() === "agent") {
        shortNote = `${newWalletDoc?.label} থেকে ${newData.amount} টাকা cash in করা হয়েছে।`;
      } else {
        shortNote = `${newData.amount} টাকা ${newData.type} করা হয়েছে ${
          clientNumber ? `এই নাম্বারে ${clientNumber}` : ""
        }`;
      }
    } else if (newData.type.toLowerCase() === "receive money") {
      shortNote = `${newData.total} টাকা ${newData.type} হয়েছে এই নাম্বারে ${walletNumber}`;
    } else if (newData.type.toLowerCase() === "send money") {
      shortNote = `${newData.amount} টাকা ${newData.type} করা হয়েছে ${
        clientNumber ? `এই নাম্বারে ${clientNumber}` : ""
      }`;
    } else if (newData.type.toLowerCase() === "cash") {
      shortNote = `${newClientDoc?.name} কে ${newData.amount} টাকা দেওয়া হয়েছে।`;
    }

    // Step 7: Update Transaction document
    if (existingTransaction) {
      existingTransaction.type = newData.type;
      existingTransaction.client = newData.client_id || null;
      existingTransaction.clientNumber = clientNumber || null;
      existingTransaction.amount = newData.amount || 0;
      existingTransaction.profit = newData.profit || 0;
      existingTransaction.due = newData.due || 0;
      existingTransaction.note = shortNote;
      await existingTransaction.save({ session });
    }

    // Step 8: Update DailyTransaction document
    existingDailyTxn.date = newData.date;
    existingDailyTxn.channel = newData.channel;
    existingDailyTxn.wallet_id = newData.wallet_id;
    existingDailyTxn.txn_id = newData.txn_id;
    existingDailyTxn.client_id = newData.client_id;
    existingDailyTxn.client_name = newData.client_name;
    existingDailyTxn.number = newData.number;
    existingDailyTxn.type = newData.type;
    existingDailyTxn.amount = newData.amount;
    existingDailyTxn.fee = newData.fee;
    existingDailyTxn.cost = newData.cost;
    existingDailyTxn.total = newData.total;
    existingDailyTxn.profit = newData.profit;
    existingDailyTxn.refund = newData.refund;
    existingDailyTxn.due = newData.due;
    existingDailyTxn.note = newData.note;
    existingDailyTxn.bill_type = newData.bill_type;
    existingDailyTxn.wallet_balance = newWalletDoc
      ? newWalletDoc.balance
      : null;

    await existingDailyTxn.save({ session });

    // Step 9: Send SMS if needed
    if (newData.isSendMessage && clientNumber) {
      const smsText =
        newData.message && newData.message.trim() !== ""
          ? newData.message
          : shortNote;
      await sendSMS(clientNumber, smsText);
    }

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: "Daily transaction updated successfully",
      data: {
        dailyTxn: existingDailyTxn,
        walletDoc: newWalletDoc,
        clientDoc: newClientDoc,
        txn: existingTransaction,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    // Handle specific business errors
    if (error.message === "insufficient wallet balance") {
      return res.status(400).json({
        message: "ওয়ালেটে পর্যাপ্ত ব্যালেন্স নেই",
        error: error.message,
      });
    }

    if (error.message === "Daily transaction not found") {
      return res.status(404).json({
        message: "ডেইলি ট্রানজেকশন পাওয়া যায়নি",
        error: error.message,
      });
    }

    if (error.message === "Wallet not found") {
      return res.status(404).json({
        message: "ওয়ালেট পাওয়া যায়নি",
        error: error.message,
      });
    }

    if (error.message === "Client not found") {
      return res.status(404).json({
        message: "ক্লায়েন্ট পাওয়া যায়নি",
        error: error.message,
      });
    }

    res.status(500).json({
      message: "Error updating daily transaction",
      error: error.message,
    });
  }
};
