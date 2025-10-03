import Transaction from "../models/transaction.js";

export const getTransactions = async (req, res) => {
  try {
    const { skip = 0, limit = 10 } = req.query;

    const transactions = await Transaction.find()
      .populate("client", "name phone") // include client info if exists
      .sort({ createdAt: -1 }) // latest first
      .skip(Number(skip))
      .limit(Number(limit));

    res.status(200).json({
      message: "Transactions fetched successfully",
      data: transactions,
      hasMore: transactions.length === Number(limit), // if less than limit, no more data
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching transactions",
      error: error.message,
    });
  }
};
