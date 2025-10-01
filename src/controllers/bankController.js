import Bank from "../models/bank.js";

// Create a new bank entry
export const addNewBank = async (req, res) => {
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

    await newBank.save();

    res.status(201).json({
      message: "Bank saved successfully",
      data: newBank,
    });
  } catch (error) {
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
      { new: true, runValidators: true } // return updated doc & apply schema validators
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
    await bank.save();

    res.status(200).json({
      message: "Bank balance adjusted successfully",
      data: bank,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error adjusting bank balance",
      error: error.message,
    });
  }
};
