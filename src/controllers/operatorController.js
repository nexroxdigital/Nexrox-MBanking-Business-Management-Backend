import Operator from "../models/operatorModel.js";
import RechargeTxn from "../models/rechargeTxn.js";

// Create a new operator
export const createOperator = async (req, res) => {
  try {
    const { name, number, balance } = req.body;

    // Basic validation
    if (!name || !number) {
      return res.status(400).json({ message: "Name and number are required" });
    }

    const newOperator = new Operator({
      name,
      number,
      balance: balance || 0, // default to 0 if not provided
    });

    await newOperator.save();

    res.status(201).json({
      message: "Operator created successfully",
      data: newOperator,
    });
  } catch (error) {
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
  try {
    const { id } = req.params;
    const { amount } = req.body; // positive = increase, negative = decrease

    if (amount === undefined || typeof amount !== "number") {
      return res.status(400).json({ message: "Amount must be a number" });
    }

    const updatedOperator = await Operator.findByIdAndUpdate(
      id,
      { $inc: { balance: amount } }, // increment or decrement balance
      { new: true, runValidators: true }
    );

    if (!updatedOperator) {
      return res.status(404).json({ message: "Operator not found" });
    }

    res.status(200).json({
      message: "Operator balance adjusted successfully",
      data: updatedOperator,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error adjusting operator balance",
      error: error.message,
    });
  }
};

// Create a new recharge entry
export const createRecharge = async (req, res) => {
  try {
    const { date, senderNumber, receiverNumber, rechargeAmount } = req.body;

    // Basic validation
    if (!date || !senderNumber || !receiverNumber || !rechargeAmount) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Find the operator by senderNumber
    const operator = await Operator.findOne({ number: senderNumber });

    if (!operator) {
      return res.status(404).json({ message: "Operator not found" });
    }

    // Check if operator has enough balance
    if (operator.balance < rechargeAmount) {
      return res.status(400).json({ message: "Insufficient operator balance" });
    }

    // Subtract recharge amount
    operator.balance -= rechargeAmount;
    await operator.save();

    // Create recharge history with the updated balance
    const newRecharge = new RechargeTxn({
      date,
      senderNumber,
      receiverNumber,
      rechargeAmount,
      balance: operator.balance,
      operator: operator._id,
    });

    await newRecharge.save();

    res.status(201).json({
      message: "Recharge history saved successfully",
      data: newRecharge,
    });
  } catch (error) {
    res.status(400).json({
      message: "Error saving recharge history",
      error: error.message,
    });
  }
};

// Get all recharge history records
// export const getRechargeRecords = async (req, res) => {
//   try {
//     const histories = await RechargeTxn.find()
//       .populate("operator", "name number") // bring operator name + number
//       .sort({ date: 1 }); // latest first

//     res.status(200).json({
//       message: "Recharge histories fetched successfully",
//       data: histories,
//     });
//   } catch (error) {
//     res.status(500).json({
//       message: "Error fetching recharge histories",
//       error: error.message,
//     });
//   }
// };

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
