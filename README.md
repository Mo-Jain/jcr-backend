# 🚗 Car Rental Backend API

This is the **backend service** for the Car Rental Platform. It powers the admin dashboard and manages core functionalities like authentication, car and booking management, and payment verification using Razorpay. The server is built with **Node.js**, **Express**, and **PostgreSQL** using **Prisma ORM**.

---

## ✨ Features

- 🔐 **Admin Authentication** using JWT or session-based login
- 🚗 **Car Management**: Add/edit/delete cars with image upload support
- 📅 **Booking Management**: View, filter, and manage bookings
- 💳 **Razorpay Payment Integration**: Payment capture and webhook verification
- 📊 **Earnings & Stats API**: Summary and analytics endpoints
- 🧾 **Invoice/receipt generation** (optional if applicable)
- 🌐 **CORS and secure API routing**
- 🧪 Ready for production deployment with environment config

---

## 🛠️ Tech Stack

- **Runtime**: Node.js  
- **Framework**: Express.js  
- **Database**: PostgreSQL  
- **ORM**: Prisma  
- **Authentication**: JWT (JSON Web Tokens)  
- **Payment Gateway**: Razorpay  
- **Deployment**: Render / Railway / EC2 / custom VPS

---

## 🔐 Authentication

All routes under `/admin` are protected using JWT. Admins must log in with valid credentials to access or modify data.

---

## 💳 Payment Integration (Razorpay)

- Supports payment creation and success verification
- Razorpay **webhook integration** to mark booking as paid
- Track total revenue and pending payments

---

## 📂 Folder Structure

```bash
src/
├── controllers/       # Business logic and route handlers
├── routes/            # Express route definitions
├── middleware/        # Auth, error handling, etc.
├── prisma/            # Prisma schema and DB client
├── utils/             # Helper functions
├── services/          # Payment and mail integrations
├── index.ts           # Entry point
