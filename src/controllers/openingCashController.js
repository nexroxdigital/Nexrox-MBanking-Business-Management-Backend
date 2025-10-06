import OpeningCash from "../models/openingCash.js";

// Get today's opening cash
export const getTodayOpeningCash = async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    let opening = await OpeningCash.findOne({ date: today });

    // If not found, create new with 0 automatically
    if (!opening) {
      opening = await OpeningCash.create({ date: today, amount: 0 });
    }

    res.json({ success: true, data: opening });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Set or update today's opening cash
export const setOpeningCash = async (req, res) => {
  // console.log(req.body);
  try {
    const today = new Date().toISOString().split("T")[0];
    const { amount } = req.body;

    let opening = await OpeningCash.findOneAndUpdate(
      { date: today },
      { amount },
      { new: true, upsert: true }
    );

    res.json({ success: true, data: opening });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
