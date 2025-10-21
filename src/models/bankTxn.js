import mongoose from "mongoose";

const bankTransactionSchema = new mongoose.Schema(
  {
    date: {
      type: String, // ISO date string from frontend
      required: false,
    },
    time: {
      type: String, // time string (HH:mm or similar) from frontend
      required: false,
    },
    senderBank: {
      type: String,
      required: true,
      trim: true,
    },
    senderBranch: {
      type: String,
      required: true,
      trim: true,
    },
    senderName: {
      type: String,
      required: true,
      trim: true,
    },
    senderAccount: {
      type: String,
      required: false,
      trim: true,
    },
    receiverName: {
      type: String,
      required: true,
      trim: true,
    },
    receiverAccount: {
      type: String,
      required: false,
      trim: true,
    },
    receiverBank: {
      type: String,
      required: false,
      trim: true,
    },
    receiverBranch: {
      type: String,
      required: false,
      trim: true,
    },
    method: {
      type: String,
      required: false,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    fee: {
      type: Number,
      required: false,
      default: 0,
    },
    pay: {
      type: Number,
      required: false,
      default: 0,
    },
    type: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "bank_txn",
  }
);

const BankTxn = mongoose.model("Bank_Txn", bankTransactionSchema);

export default BankTxn;
