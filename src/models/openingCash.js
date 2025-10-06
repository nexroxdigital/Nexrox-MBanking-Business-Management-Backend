import mongoose from "mongoose";

const openingCashSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
    unique: true,
  },
  amount: {
    type: Number,
    required: true,
    default: 0,
  },
});

const OpeningCash = mongoose.model("OpeningCash", openingCashSchema);
export default OpeningCash;
