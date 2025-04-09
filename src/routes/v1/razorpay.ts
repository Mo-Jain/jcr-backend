import { Router } from "express";
import client from "../../store/src";
import { middleware } from "../../middleware";
import dotenv from "dotenv";
import Razorpay from "razorpay";
import crypto from "crypto";
import nodemailer from "nodemailer";
import express from "express";
// Load environment variables
dotenv.config();

export const razorpayRouter = Router();

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

razorpayRouter.post("/order/:bookingId",middleware,async (req,res) => {
    try{
        const {bookingId} = req.params;

        if(!bookingId) {
            res.status(400).json({ message: "Booking id is required" });
            return;
        }

        const user = await client.customer.findFirst({
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
        }
    
        const response = await razorpay.orders.create(options);

        console.log("response",response)
    
        await client.payment.create({
            data: {
                id: response.id,
                amount: Number(req.body.amount),
                method: response.method || "other",
                status: "pending",
                customerId: req.userId!,
                bookingId: bookingId
            }
        })
    
        res.json({
            message: "Order created successfully",
            order:{
                id: response.id,
                currency:response.currency,
                amount: response.amount,
            }
        })
        return;
    }catch(e){
        res.status(500).json({
            message: "Internal server error",
            error: e,
        });
        return;
    }
})

razorpayRouter.get('/payment/:id',middleware,async (req,res) => {
    const {id} = req.params;

    try{
        const payment = await client.payment.findFirst({    
            where: {
                id: req.params.id,
            },
        });
        
        if(!payment) {
            res.status(404).json({ message: "Payment not found" });
            return;
        }
        res.json({
            message: "Payment fetched successfully",
            status: payment.status,
            method: payment.method,
            amount: payment.amount,
            currency:"INR",
        })
        return;
    }catch(e){
        res.status(500).json({
            message: "Internal server error",
            error: e,
        });
        return;
    }
})

razorpayRouter.post('/payment-status',middleware,async (req,res) => {
    try{
        const {signature,order_id, payment_id,status} = req.body;

        if(!order_id || !payment_id || !signature) {
            res.status(400).json({ message: "Wrong input data" });
            return;
        }

        const expected_signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET as string)
        .update(order_id+"|"+payment_id )
        .digest('hex');


        if(signature === expected_signature) {
            const paymentDetails = await razorpay.payments.fetch(payment_id);

            const order = await client.payment.update({
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
                })

            if(order && order.customer.email){
                const transporter = nodemailer.createTransport({
                    service: "gmail",
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS,
                    },
                });

                await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: order.customer.email,
                    subject: "Payment Confirmation - Jain Car Rentals",
                    text: `Dear ${order.customer.name || "Customer"},/n/nWe are pleased to confirm that we have received your payment of ₹${order.amount} for your recent booking with Jain Car Rentals.\n\nThank you for choosing our services. If you have any questions or need further assistance, feel free to contact us.\n\nBest regards,\n\nJain Car Rentals  
                  `,
                  })
            }

            const currentAmount = order.booking?.advancePayment || 0;

            if(order.bookingId){
                const booking = await client.booking.update({
                    where: {
                        id: order.bookingId,
                    },
                    data: {
                        paymentMethod: paymentDetails.method,
                        advancePayment: currentAmount + (order.amount/100),
                        status: status,
                    }
                });
                console.log("booking",booking)
            }

            res.json({
                success: true,
                message: "Payment verified successfully",
                paymentMethod: order.method,
            })
            return;
        }
        else{
            res.status(404).json({success:false, message: "Payment not verified" });
        }
        
    }catch(e){
        console.error(e);
        res.status(500).json({
            message: "Internal server error",
            error: e,
        });
        return;
    }
})

razorpayRouter.put("/cancel-order", middleware, async (req, res) => {
    const { order_id } = req.body;
  
    try {
      const existing = await client.payment.findFirst({
        where: {
          id: order_id,
          status: "pending",
        },
      });
  
      if (!existing) {
         res.status(404).json({ message: "Pending order not found" });
         return;
      }
  
      await client.payment.update({
        where: {
          id: order_id,
        },
        data: {
          status: "cancelled",
        },
      });
  
       res.json({ success: true, message: "Order marked as cancelled" });
       return;
    } catch (err) {
      console.error(err);
       res.status(500).json({ message: "Internal server error" });
       return
    }
  });

razorpayRouter.get("/recent-pending/:bookingId", middleware, async (req, res) => {
    try {
        const {bookingId} = req.params;

        if(!bookingId) {
            res.status(400).json({ message: "Booking id is required" });
            return;
        }

        const recentPending = await client.payment.findFirst({
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
            return
        }
  
       res.json({
        order: {
          id: recentPending.id,
          amount: recentPending.amount,
          currency: "INR",
        },
      });
      return
    } catch (err) {
      console.error(err);
       res.status(500).json({ message: "Internal server error" });
       return
    }
  });


// Webhook endpoint
razorpayRouter.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;
    const signature = req.headers["x-razorpay-signature"] as string;
    const body = req.body;

    const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(req.body.toString()) // raw body
        .digest("hex");

    if (signature !== expectedSignature) {
         res.status(400).json({ message: "Invalid signature" });
         return
    }

    try {
        const event = JSON.parse(req.body.toString());
        if (event.event === "payment.captured") {
            const payment = event.payload.payment.entity;
            
            const razorpayOrderId = payment.order_id;
            const amount = payment.amount;
            const method = payment.method;

            // Update payment in DB
            const order = await client.payment.update({
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

            if(order && order.customer.email){
                const transporter = nodemailer.createTransport({
                    service: "gmail",
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS,
                    },
                });

                await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: order.customer.email,
                    subject: "Payment Confirmation - Jain Car Rentals",
                    text: `Dear ${order.customer.name || "Customer"},/n/nWe are pleased to confirm that we have received your payment of ₹${order.amount} for your recent booking with Jain Car Rentals.\n\nThank you for choosing our services. If you have any questions or need further assistance, feel free to contact us.\n\nBest regards,\n\nJain Car Rentals  
                  `,
                  })
            }

            const currentAmount = order.booking?.advancePayment || 0;

            if(order.bookingId){
                const booking = await client.booking.update({
                    where: {
                        id: order.bookingId,
                    },
                    data: {
                        paymentMethod: payment.method,
                        advancePayment: currentAmount + (order.amount/100),
                    }
                });
                console.log("booking",booking)
            }

            res.json({
                success: true,
                message: "Payment verified successfully",
                paymentMethod: order.method,
            })
            return;
        } else {
            res.json({ status: "ignored" });
            return;
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
        return;
    }
});

  
 