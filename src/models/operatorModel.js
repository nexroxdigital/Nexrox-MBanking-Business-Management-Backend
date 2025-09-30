import mongoose from "mongoose";

const operatorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  number: {
    type: String,
    required: true,
    unique: true,
  },
  balance: {
    type: Number,
    default: 0,
  },
});

const Operator = mongoose.model("Operator", operatorSchema);

export default Operator;
