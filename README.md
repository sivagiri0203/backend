✈️ Flight Booking Backend (Node.js + Express + MongoDB)

Backend API for a Flight Booking system with:

✅ JWT Auth (User/Admin)  
✅ Flights Search (AviationStack API)  
✅ Bookings (Create / View / Cancel)  
✅ Razorpay Payments (Order + Verify)  
✅ Brevo Email Notifications (Booking created / Payment confirmed)  
✅ Cron Jobs (Flight status updates + automated reminders)  
✅ Admin Analytics APIs  

---

## 📁 Folder Structure

backend/
├── config/
│ ├── db.js
│ ├── aviationstack.js
│ ├── razorpay.js
│ └── brevo.js
├── controllers/
│ ├── auth.controller.js
│ ├── flights.controller.js
│ ├── bookings.controller.js
│ ├── payments.controller.js
│ └── admin.controller.js
├── jobs/
│ ├── flightStatus.cron.js
│ └── notifications.cron.js (optional if you added)
├── middleware/
│ ├── auth.middleware.js
│ ├── admin.middleware.js
│ └── error.middleware.js
├── models/
│ ├── User.js
│ ├── Booking.js
│ ├── Payment.js
│ ├── FlightCache.js
│ └── FlightStatus.js
├── routes/
│ ├── auth.routes.js
│ ├── flights.routes.js
│ ├── bookings.routes.js
│ ├── payments.routes.js
│ └── admin.routes.js
├── utils/
│ ├── response.js
│ ├── generatePNR.js
│ ├── money.js
│ ├── sendEmail.js
│ └── emailTemplates.js (optional if you added)
├── .env
├── index.js
└── package.json

yaml
Copy code

---

## ✅ Requirements

- Node.js >= 18
- MongoDB Atlas (or local MongoDB)
- AviationStack API Key
- Razorpay Test/Live Keys
- Brevo API Key

---

## ⚙️ Installation

```bash
cd backend
npm install
🔑 Environment Variables
Create a .env file inside backend/:

env
Copy code
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

# Frontend CORS
CORS_ORIGIN=http://localhost:5173

# AviationStack
AVIATIONSTACK_ACCESS_KEY=your_aviationstack_key
AVIATIONSTACK_BASE_URL=https://api.aviationstack.com/v1

# Razorpay (Test/Live)
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret

# Brevo (Sendinblue)
BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_NAME=FlyBook
BREVO_SENDER_EMAIL=your_sender_email@example.com

# Admin bootstrap (optional)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=Admin@123
🔥 Notes
After deploying frontend on Netlify, set:
CORS_ORIGIN=https://your-site.netlify.app

If you want to allow multiple origins, update your CORS config accordingly.

▶️ Run Locally
bash
Copy code
npm run dev
Your API will run at:

✅ http://localhost:5000

🧪 Testing API (Postman / Thunder Client)
Base URL (local)
http://localhost:5000/api

Base URL (Render)
https://your-render-backend.onrender.com/api

🔐 Auth Routes
Register
POST /api/auth/register

Body:

json
Copy code
{
  "name": "Siva",
  "email": "siva@gmail.com",
  "password": "123456"
}
Login
POST /api/auth/login

Body:

json
Copy code
{
  "email": "siva@gmail.com",
  "password": "123456"
}
Response includes JWT token.

✅ Use token in headers:
Authorization: Bearer <token>

✈️ Flights Routes (AviationStack)
Search Flights
GET /api/flights/search?depIata=MAA&arrIata=DEL&date=2026-02-10&limit=10

📌 Bookings Routes
Create Booking
POST /api/bookings (Auth required)

Body:

json
Copy code
{
  "flight": { "flight": { "iata": "AI202" }, "departure": { "iata": "MAA" }, "arrival": { "iata": "DEL" } },
  "passengers": [{ "fullName": "Siva", "age": 22, "gender": "male" }],
  "seats": ["12A"],
  "cabinClass": "economy",
  "amount": 4999
}
My Bookings
GET /api/bookings/me (Auth required)

Booking Details
GET /api/bookings/:id (Auth required)

Cancel Booking
PATCH /api/bookings/:id/cancel (Auth required)

💳 Payments Routes (Razorpay)
Create Razorpay Order
POST /api/payments/create-order (Auth required)

Body:

json
Copy code
{
  "bookingId": "BOOKING_ID"
}
Verify Payment
POST /api/payments/verify (Auth required)

Body:

json
Copy code
{
  "bookingId": "BOOKING_ID",
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_signature": "signature_xxx"
}
✅ In test mode you can use:

Card: 4111 1111 1111 1111

UPI: success@razorpay

📧 Emails (Brevo)
Emails are sent from backend using Brevo:

Booking Created

Payment Success

(Optional) Status update / reminders

Make sure these env vars are correct:

BREVO_API_KEY

BREVO_SENDER_NAME

BREVO_SENDER_EMAIL

⏱️ Cron Jobs
flightStatus.cron.js
Updates flight status periodically and stores it in FlightStatus collection.

notifications.cron.js (optional)
Sends automated emails:

status change alerts

24-hour reminder

3-hour reminder

flight today alert

✅ Start cron from index.js:

js
Copy code
import { startFlightStatusCron } from "./jobs/flightStatus.cron.js";
import { startNotificationsCron } from "./jobs/notifications.cron.js";

startFlightStatusCron();
startNotificationsCron();
👑 Admin
Create Test Admin
If you set these in .env:

env
Copy code
ADMIN_EMAIL=mastersivagiri@gmail.com
ADMIN_PASSWORD=8940203844
Backend can auto-create admin on first run (if implemented).

Admin APIs
/api/admin/... (Admin token required)

Examples:

Total users

Total bookings

Total revenue

Recent payments

🚀 Deploy Backend on Render
Push backend to GitHub

Create new Render Web Service

Build command:

bash
Copy code
npm install
Start command:

bash
Copy code
node index.js
Add environment variables in Render dashboard:

MONGO_URI, JWT_SECRET, CORS_ORIGIN, etc.

✅ After deploy, your backend URL:
https://your-render-service.onrender.com

🌐 Connect Netlify Frontend
Frontend must call:
https://your-render-service.onrender.com/api

Update frontend API baseURL:

js
Copy code
baseURL: "https://your-render-service.onrender.com/api"
Also update backend .env:

env
Copy code
CORS_ORIGIN=https://your-site.netlify.app
🛠️ Troubleshooting
CORS error
Fix CORS_ORIGIN in backend and redeploy.

Search failed
Check:

AVIATIONSTACK_ACCESS_KEY is correct

AviationStack plan supports flight endpoint you use

Razorpay verification failed
Ensure you use same KEY_SECRET in backend

Verify payload fields are correct




