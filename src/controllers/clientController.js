import mongoose from "mongoose";
import Client from "../models/client.js";
import Transaction from "../models/transaction.js";
import { sendSMS } from "../utils/smsService.js";

// Create a new client
export const addNewClient = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { name, phone, totalSale, paid, due } = req.body;

    // Basic validation
    if (!name || !phone) {
      return res.status(400).json({ message: "Name and phone are required" });
    }

    const newClient = new Client({
      name,
      phone,
      totalSale: totalSale || 0,
      paid: paid || 0,
      due: due || 0,
    });

    await newClient.save({ session });

    const txn = new Transaction({
      type: "client add",
      note: "নতুন ক্লাইন্ট যোগ করা হয়েছে",
      amount: null,
      profit: null,
      due: null,
    });

    await txn.save({ session });

    //  Commit transaction
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: "Client created successfully",
      data: newClient,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    res.status(400).json({
      message: "Error creating client",
      error: error.message,
    });
  }
};

// Get clients with pagination
export const getClients = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // current page (default 1)
    const limit = parseInt(req.query.limit) || 10; // rows per page (default 10)
    const skip = (page - 1) * limit;

    // Fetch clients with pagination
    const clients = await Client.find().skip(skip).limit(limit);

    // Total count
    const totalClients = await Client.countDocuments();

    res.status(200).json({
      message: "Clients fetched successfully",
      data: clients,
      pagination: {
        total: totalClients,
        page,
        limit,
        totalPages: Math.ceil(totalClients / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching clients",
      error: error.message,
    });
  }
};

// Get clients with infinity scrolling
export const getClientsSelect = async (req, res) => {
  try {
    const clients = await Client.find().sort({ createdAt: -1 });

    res.status(200).json({
      message: "Clients fetched successfully",
      data: clients,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching clients",
      error: error.message,
    });
  }
};

// Delete a client by ID
export const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedClient = await Client.findByIdAndDelete(id);

    if (!deletedClient) {
      return res.status(404).json({ message: "Client not found" });
    }

    res.status(200).json({
      message: "Client deleted successfully",
      data: deletedClient,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting client",
      error: error.message,
    });
  }
};

// Update client (only name & phone)
export const updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone } = req.body;

    // Validate input
    if (!name || !phone) {
      return res.status(400).json({ message: "Name and phone are required" });
    }

    const updatedClient = await Client.findByIdAndUpdate(
      id,
      { name, phone },
      { new: true, runValidators: true }
    );

    if (!updatedClient) {
      return res.status(404).json({ message: "Client not found" });
    }

    res.status(200).json({
      message: "Client updated successfully",
      data: updatedClient,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating client",
      error: error.message,
    });
  }
};

// Adjust client payment
export const adjustClientPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { amount, isSendMessage, message } = req.body;

    // console.log("id", id);

    // console.log("client number in adjust balance", number);

    if (!amount || typeof amount !== "number") {
      return res.status(400).json({ message: "Valid amount is required" });
    }

    // Find client
    const client = await Client.findById(id).session(session);

    // console.log("client in adjust balance", client);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    // if amount is greater than due, return error
    if (amount > client.due) {
      return res.status(400).json({ message: "Amount is greater than due" });
    }

    // Adjust paid & due
    const newPaid = client.paid + amount;
    const newDue = client.totalSale - newPaid;

    if (newDue <= 0) {
      client.totalSale = 0;
      client.paid = 0;
      client.due = 0;
    } else {
      client.paid = newPaid;
      client.due = newDue;
    }

    await client.save({ session });

    //  Create transaction record
    const txn = new Transaction({
      type: "paid",
      client: client._id,
      clientNumber: client.phone,
      amount: amount,
      note: `${amount} টাকা প্রদান করেছেন ${client.name}`,
      meta: { action: "clientPayment" },
    });

    await txn.save({ session });

    // Handle SMS
    if (isSendMessage) {
      const smsText =
        message && message.trim().length > 0
          ? message
          : `প্রিয় ${client.name}, আপনার ${amount} টাকা গ্রহণ করা হয়েছে। বর্তমান পাওনা ${client.due} টাকা।`;

      await sendSMS(client.phone, smsText);
    }

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: "Payment adjusted successfully",
      client,
      transaction: txn,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    res.status(500).json({
      message: "Error processing client payment",
      error: error.message,
    });
  }
};

// controllers/transactionController.js
export const getTransactionsByClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { number, skip = 0, limit = 10 } = req.query;

    let query = {};
    if (id !== "null" || id !== "undefined") {
      query.client = id;
    } else if (number) {
      query.clientNumber = number;
    }

    const transactions = await Transaction.find(query)
      .populate("client", "name phone")
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit));

    res.status(200).json({
      message: "Transactions fetched successfully",
      data: transactions,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching transactions",
      error: error.message,
    });
  }
};
