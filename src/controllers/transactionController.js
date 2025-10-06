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

export const getTodaysTransactionReport = async (req, res) => {
  try {
    //  Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split("T")[0];

    //  Define today's range (start & end of the day)
    const startOfDay = new Date(`${today}T00:00:00.000Z`);
    const endOfDay = new Date(`${today}T23:59:59.999Z`);

    // Get all today's transactions
    const transactions = await Transaction.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    //  Filter out bank transactions for calculation
    const nonBankTxns = transactions.filter(
      (txn) => txn.type?.toLowerCase() !== "bank"
    );

    //  Calculate totals
    const totalSale = nonBankTxns
      .reduce((sum, txn) => sum + Number(txn.amount || 0), 0)
      .toFixed(2);
    const totalProfit = nonBankTxns
      .reduce((sum, txn) => sum + Number(txn.profit || 0), 0)
      .toFixed(2);
    const totalDue = nonBankTxns
      .reduce((sum, txn) => sum + Number(txn.due || 0), 0)
      .toFixed(2);

    //  Send response
    res.status(200).json({
      message: "আজকের ট্রানজেকশন রিপোর্ট",
      date: today,
      totals: {
        totalSale,
        totalProfit,
        totalDue,
      },
      count: transactions.length,
    });
  } catch (error) {
    res.status(500).json({
      message: "আজকের রিপোর্ট আনতে সমস্যা হয়েছে",
      error: error.message,
    });
  }
};

export const getRunningMonthReport = async (req, res) => {
  try {
    //  Get the first day of this month and today's date
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    //  Fetch transactions created between 1st of this month and now
    const transactions = await Transaction.find({
      createdAt: { $gte: firstDayOfMonth, $lte: today },
    });

    //  Filter out bank transactions for calculation
    const nonBankTxns = transactions.filter(
      (txn) => txn.type?.toLowerCase() !== "bank"
    );

    // 3Calculate totals with two decimal precision
    const totalSale = nonBankTxns
      .reduce((sum, txn) => sum + (txn.amount || 0), 0)
      .toFixed(2);

    const totalProfit = nonBankTxns
      .reduce((sum, txn) => sum + (txn.profit || 0), 0)
      .toFixed(2);

    const totalDue = nonBankTxns
      .reduce((sum, txn) => sum + (txn.due || 0), 0)
      .toFixed(2);

    // Send formatted response
    res.status(200).json({
      message: "এই মাসের (চলতি মাস) ট্রানজেকশন রিপোর্ট",
      period: {
        from: firstDayOfMonth.toISOString().split("T")[0],
        to: today.toISOString().split("T")[0],
      },
      totals: {
        totalSale,
        totalProfit,
        totalDue,
      },
      count: transactions.length,
    });
  } catch (error) {
    res.status(500).json({
      message: "চলতি মাসের রিপোর্ট আনতে সমস্যা হয়েছে",
      error: error.message,
    });
  }
};

export const getLast30DaysReport = async (req, res) => {
  try {
    // 1️⃣ Define date range (today → 30 days back)
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setDate(today.getDate() - 30);

    // 2️⃣ Fetch all transactions within that range
    const transactions = await Transaction.find({
      createdAt: { $gte: lastMonth, $lte: today },
    }).lean();

    //  Filter out bank transactions for calculation
    const nonBankTxns = transactions.filter(
      (txn) => txn.type?.toLowerCase() !== "bank"
    );

    // 3️⃣ Group by date (YYYY-MM-DD)
    const grouped = {};

    nonBankTxns.forEach((txn) => {
      const dateKey = new Date(txn.createdAt).toISOString().split("T")[0];

      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          date: dateKey,
          totalSale: 0,
          totalProfit: 0,
          totalDue: 0,
        };
      }

      grouped[dateKey].totalSale += txn.amount || 0;
      grouped[dateKey].totalProfit += txn.profit || 0;
      grouped[dateKey].totalDue += txn.due || 0;
    });

    // 4️⃣ Convert object → sorted array by date
    const result = Object.values(grouped)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((r) => ({
        ...r,
        totalSale: Number(r.totalSale.toFixed(2)),
        totalProfit: Number(r.totalProfit.toFixed(2)),
        totalDue: Number(r.totalDue.toFixed(2)),
      }));

    // 5️⃣ Return clean response
    res.status(200).json({
      message: "গত ৩০ দিনের রিপোর্ট",
      period: {
        from: lastMonth.toISOString().split("T")[0],
        to: today.toISOString().split("T")[0],
      },
      count: result.length,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      message: "রিপোর্ট আনতে সমস্যা হয়েছে",
      error: error.message,
    });
  }
};
