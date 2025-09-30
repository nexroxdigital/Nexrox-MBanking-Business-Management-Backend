import mongoose from "mongoose";

const testSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    score: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const Test = mongoose.model("Testmobilie", testSchema);

export default Test;
