import Operator from "../models/operatorModel.js";

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
