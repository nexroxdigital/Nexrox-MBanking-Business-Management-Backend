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
  denominations: [
    {
      value: {
        type: Number,
        required: true,
      },
      count: {
        type: Number,
        required: true,
        default: 0,
      },
      enabled: {
        type: Boolean,
        default: true,
      },
      custom: {
        type: Boolean,
        default: false,
      },
    },
  ],
});

const OpeningCash = mongoose.model("OpeningCash", openingCashSchema);
export default OpeningCash;
