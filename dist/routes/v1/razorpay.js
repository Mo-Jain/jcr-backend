"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.razorpayRouter = void 0;
const express_1 = require("express");
const src_1 = __importDefault(require("../../store/src"));
const middleware_1 = require("../../middleware");
const dotenv_1 = __importDefault(require("dotenv"));
const razorpay_1 = __importDefault(require("razorpay"));
const crypto_1 = __importDefault(require("crypto"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const express_2 = __importDefault(require("express"));
// Load environment variables
dotenv_1.default.config();
exports.razorpayRouter = (0, express_1.Router)();
const razorpay = new razorpay_1.default({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});
exports.razorpayRouter.post("/order/:bookingId", middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { bookingId } = req.params;
        if (!bookingId) {
            res.status(400).json({ message: "Booking id is required" });
            return;
        }
        const user = yield src_1.default.customer.findFirst({
            where: {
                id: req.userId,
            },
        });
        if (!user) {
            res.status(404).json({ message: "Unauthorized" });
            return;
        }
        const options = {
            amount: req.body.amount.toString(),
            currency: "INR",
            receipt: 'receipt-' + Date.now(),
            payment_capture: true,
        };
        const response = yield razorpay.orders.create(options);
        console.log("response", response);
        yield src_1.default.payment.create({
            data: {
                id: response.id,
                amount: Number(req.body.amount),
                method: response.method || "other",
                status: "pending",
                customerId: req.userId,
                bookingId: bookingId
            }
        });
        res.json({
            message: "Order created successfully",
            order: {
                id: response.id,
                currency: response.currency,
                amount: response.amount,
            }
        });
        return;
    }
    catch (e) {
        res.status(500).json({
            message: "Internal server error",
            error: e,
        });
        return;
    }
}));
exports.razorpayRouter.get('/payment/:id', middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const payment = yield src_1.default.payment.findFirst({
            where: {
                id: req.params.id,
            },
        });
        if (!payment) {
            res.status(404).json({ message: "Payment not found" });
            return;
        }
        res.json({
            message: "Payment fetched successfully",
            status: payment.status,
            method: payment.method,
            amount: payment.amount,
            currency: "INR",
        });
        return;
    }
    catch (e) {
        res.status(500).json({
            message: "Internal server error",
            error: e,
        });
        return;
    }
}));
exports.razorpayRouter.post('/payment-status', middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { signature, order_id, payment_id, status } = req.body;
        if (!order_id || !payment_id || !signature) {
            res.status(400).json({ message: "Wrong input data" });
            return;
        }
        const expected_signature = crypto_1.default
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(order_id + "|" + payment_id)
            .digest('hex');
        if (signature === expected_signature) {
            const paymentDetails = yield razorpay.payments.fetch(payment_id);
            const order = yield src_1.default.payment.update({
                where: {
                    id: order_id,
                },
                data: {
                    status: "completed",
                    method: paymentDetails.method,
                },
                include: {
                    customer: true,
                    booking: true,
                }
            });
            if (order && order.customer.email) {
                const transporter = nodemailer_1.default.createTransport({
                    service: "gmail",
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS,
                    },
                });
                yield transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: order.customer.email,
                    subject: "Payment Confirmation - Jain Car Rentals",
                    text: `Dear ${order.customer.name || "Customer"},/n/nWe are pleased to confirm that we have received your payment of ₹${order.amount} for your recent booking with Jain Car Rentals.\n\nThank you for choosing our services. If you have any questions or need further assistance, feel free to contact us.\n\nBest regards,\n\nJain Car Rentals  
                  `,
                });
            }
            const currentAmount = ((_a = order.booking) === null || _a === void 0 ? void 0 : _a.advancePayment) || 0;
            if (order.bookingId) {
                const booking = yield src_1.default.booking.update({
                    where: {
                        id: order.bookingId,
                    },
                    data: {
                        paymentMethod: paymentDetails.method,
                        advancePayment: currentAmount + (order.amount / 100),
                        status: status,
                    }
                });
                console.log("booking", booking);
            }
            res.json({
                success: true,
                message: "Payment verified successfully",
                paymentMethod: order.method,
            });
            return;
        }
        else {
            res.status(404).json({ success: false, message: "Payment not verified" });
        }
    }
    catch (e) {
        console.error(e);
        res.status(500).json({
            message: "Internal server error",
            error: e,
        });
        return;
    }
}));
exports.razorpayRouter.put("/cancel-order", middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { order_id } = req.body;
    try {
        const existing = yield src_1.default.payment.findFirst({
            where: {
                id: order_id,
                status: "pending",
            },
        });
        if (!existing) {
            res.status(404).json({ message: "Pending order not found" });
            return;
        }
        yield src_1.default.payment.update({
            where: {
                id: order_id,
            },
            data: {
                status: "cancelled",
            },
        });
        res.json({ success: true, message: "Order marked as cancelled" });
        return;
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
        return;
    }
}));
exports.razorpayRouter.get("/recent-pending/:bookingId", middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { bookingId } = req.params;
        if (!bookingId) {
            res.status(400).json({ message: "Booking id is required" });
            return;
        }
        const recentPending = yield src_1.default.payment.findFirst({
            where: {
                customerId: req.userId,
                status: "pending",
                createdAt: {
                    gt: new Date(Date.now() - 5 * 60 * 1000), // within last 5 minutes
                },
                bookingId: bookingId
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        if (!recentPending) {
            res.json({ order: null });
            return;
        }
        res.json({
            order: {
                id: recentPending.id,
                amount: recentPending.amount,
                currency: "INR",
            },
        });
        return;
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
        return;
    }
}));
// Webhook endpoint
exports.razorpayRouter.post("/webhook", express_2.default.raw({ type: "application/json" }), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];
    const body = req.body;
    const expectedSignature = crypto_1.default
        .createHmac("sha256", secret)
        .update(req.body.toString()) // raw body
        .digest("hex");
    if (signature !== expectedSignature) {
        res.status(400).json({ message: "Invalid signature" });
        return;
    }
    try {
        const event = JSON.parse(req.body.toString());
        if (event.event === "payment.captured") {
            const payment = event.payload.payment.entity;
            const razorpayOrderId = payment.order_id;
            const amount = payment.amount;
            const method = payment.method;
            // Update payment in DB
            const order = yield src_1.default.payment.update({
                where: { id: razorpayOrderId },
                data: {
                    status: "completed",
                    method: method,
                },
                include: {
                    customer: true,
                    booking: true,
                }
            });
            if (order && order.customer.email) {
                const transporter = nodemailer_1.default.createTransport({
                    service: "gmail",
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS,
                    },
                });
                yield transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: order.customer.email,
                    subject: "Payment Confirmation - Jain Car Rentals",
                    text: `Dear ${order.customer.name || "Customer"},/n/nWe are pleased to confirm that we have received your payment of ₹${order.amount} for your recent booking with Jain Car Rentals.\n\nThank you for choosing our services. If you have any questions or need further assistance, feel free to contact us.\n\nBest regards,\n\nJain Car Rentals  
                  `,
                });
            }
            const currentAmount = ((_a = order.booking) === null || _a === void 0 ? void 0 : _a.advancePayment) || 0;
            if (order.bookingId) {
                const booking = yield src_1.default.booking.update({
                    where: {
                        id: order.bookingId,
                    },
                    data: {
                        paymentMethod: payment.method,
                        advancePayment: currentAmount + (order.amount / 100),
                    }
                });
                console.log("booking", booking);
            }
            res.json({
                success: true,
                message: "Payment verified successfully",
                paymentMethod: order.method,
            });
            return;
        }
        else {
            res.json({ status: "ignored" });
            return;
        }
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
        return;
    }
}));
