import mongoose from "mongoose";

const walletNumberSchema = new mongoose.Schema({
  label: {
    type: String,
    required: true,
    trim: true,
  },
  number: {
    type: String,
    required: true,
  },
  channel: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  balance: {
    type: Number,
    default: 0,
  },
});

const WalletNumber = mongoose.model("WalletNumber", walletNumberSchema);

export default WalletNumber;
