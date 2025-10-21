import mongoose from "mongoose";

const loadHistorySchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      default: Date.now,
    },
    amount: {
      type: Number,
      required: true,
    },
    operator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Operator",
      required: true,
    },
    newBalance: {
      type: Number,
      required: true,
    },
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      required: false,
    },
  },
  { timestamps: true }
);

const LoadHistory = mongoose.model("LoadHistory", loadHistorySchema);

export default LoadHistory;
