import mongoose from "mongoose";

const flightStatusSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, unique: true },
    flightIata: { type: String, trim: true },
    lastStatus: { type: String, trim: true },
    lastPayload: { type: Object },
    lastCheckedAt: { type: Date }
  },
  { timestamps: true }
);

export default mongoose.model("FlightStatus", flightStatusSchema);