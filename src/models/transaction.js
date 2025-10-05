import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: false,
    },
    clientNumber: {
      type: String,
      trim: true,
      required: false,
    },
    amount: {
      type: Number,
      required: true,
    },
    profit: {
      type: Number,
      default: 0,
    },
    due: {
      type: Number,
      default: 0,
    },
    note: {
      type: String,
      trim: true,
    },
    meta: {
      type: Object, // can store any additional info as key-value
      default: {},
    },
  },
  {
    timestamps: true, // adds createdAt & updatedAt
  }
);

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;
