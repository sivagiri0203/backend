import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },

    provider: { type: String, default: "razorpay" },
    amount: { type: Number, required: true },     // INR major units
    currency: { type: String, default: "INR" },

    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },

    status: { type: String, enum: ["created", "paid", "failed"], default: "created" },
    notes: { type: Object, default: {} }
  },
  { timestamps: true }
);

export default mongoose.model("Payment", paymentSchema);