import mongoose from "mongoose";

const dailyTransactionSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
    },
    channel: {
      type: String,
      required: true,
      trim: true,
    },
    wallet_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WalletNumber",
      required: false,
    },
    client_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: false,
    },
    client_name: {
      type: String,
      trim: true,
      required: false,
    },
    number: {
      type: String,
      required: false,
      trim: true,
    },
    type: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    fee: {
      type: Number,
      default: 0,
    },
    cost: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      required: false,
    },
    profit: {
      type: Number,
      default: 0,
    },
    refund: {
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
    bill_type: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: "daily_transactions",
  }
);

const DailyTransaction = mongoose.model(
  "Daily_Transaction",
  dailyTransactionSchema
);

export default DailyTransaction;
