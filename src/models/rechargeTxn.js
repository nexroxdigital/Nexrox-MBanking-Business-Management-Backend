import mongoose from "mongoose";

const rechargeSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    senderNumber: {
      type: String,
      required: true,
      trim: true,
    },
    receiverNumber: {
      type: String,
      required: true,
      trim: true,
    },
    rechargeAmount: {
      type: Number,
      required: true,
    },
    balance: {
      type: Number,
      required: true,
    },
    operator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Operator", // ✅ reference Operator collection
      required: true,
    },
  },
  { collection: "recharge_txn" }
);

const RechargeTxn = mongoose.model("Recharge_Txn", rechargeSchema);

export default RechargeTxn;
