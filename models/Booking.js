import mongoose from "mongoose";

const passengerSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    age: { type: Number, required: true },
    gender: { type: String, enum: ["male", "female", "other"], required: true },
    passportNumber: { type: String, trim: true }
  },
  { _id: false }
);

const flightSchema = new mongoose.Schema(
  {
    provider: { type: String, default: "aviationstack" },
    flightIata: { type: String, trim: true },      // e.g. AI202
    flightIcao: { type: String, trim: true },
    flightNumber: { type: String, trim: true },

    airlineName: { type: String, trim: true },
    airlineIata: { type: String, trim: true },

    depIata: { type: String, trim: true },         // e.g. MAA
    arrIata: { type: String, trim: true },         // e.g. DEL

    depAirport: { type: String, trim: true },
    arrAirport: { type: String, trim: true },

    depScheduled: { type: String },                // ISO string from API
    arrScheduled: { type: String },

    status: { type: String, trim: true },          // scheduled/active/landed/etc
    raw: { type: Object }                          // store original API response (optional)
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    pnr: { type: String, required: true, unique: true },
    passengers: { type: [passengerSchema], default: [] },

    flight: { type: flightSchema, required: true },

    seats: { type: [String], default: [] },
    cabinClass: { type: String, enum: ["economy", "premium", "business", "first"], default: "economy" },

    amount: { type: Number, required: true }, // INR (major units)
    currency: { type: String, default: "INR" },

    paymentStatus: { type: String, enum: ["pending", "paid", "failed", "refunded"], default: "pending" },
    bookingStatus: { type: String, enum: ["confirmed", "cancelled"], default: "confirmed" }
  },
  { timestamps: true }


);


export default mongoose.model("Booking", bookingSchema);
