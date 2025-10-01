import mongoose from "mongoose";

const bankSchema = new mongoose.Schema({
  bank: {
    type: String,
    required: true,
    trim: true,
  },
  branch: {
    type: String,
    required: true,
    trim: true,
  },
  routingNo: {
    type: String,
  },
  accountName: {
    type: String,
    required: true,
    trim: true,
  },
  accountNumber: {
    type: String,
    required: true,
    unique: true,
  },
  balance: {
    type: Number,
    default: 0,
  },
});

const Bank = mongoose.model("Bank", bankSchema);

export default Bank;
