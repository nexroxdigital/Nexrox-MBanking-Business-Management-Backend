import mongoose from "mongoose";

const clientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  totalSale: {
    type: Number,
    default: 0,
  },
  paid: {
    type: Number,
    default: 0,
  },
  due: {
    type: Number,
    default: 0,
  },
});

const Client = mongoose.model("Client", clientSchema);

export default Client;
