import mongoose from "mongoose";

const flightCacheSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, required: true }, // hashable search key
    query: { type: Object, required: true },
    data: { type: Object, required: true },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true }
);

// TTL index
flightCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("FlightCache", flightCacheSchema);