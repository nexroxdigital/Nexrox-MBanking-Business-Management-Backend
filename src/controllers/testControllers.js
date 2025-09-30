import Test from "../models/testModel.js";

export const createTest = async (req, res) => {
  console.log(req.body);
  try {
    const test = await Test.create(req.body);
    res.status(201).json({ success: true, data: test });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
