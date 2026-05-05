const express = require("express");
const Cart = require("../models/Cart");
const Order = require("../models/Order");

const webhookRouter = express.Router();

webhookRouter.post("/", (req, res) => {
  console.log("WEBHOOK HIT");
  res.status(200).send("ok");
});

webhookRouter.post("/lemonsqueezy", async (req, res) => {
  try {
    // const event = JSON.parse(req.body.toString());
    const event = req.body;

    console.log("Webhook event:", event.meta?.event_name);

    if (event.meta.event_name === "order_created") {
      const orderData = event.data.attributes;

      const customData = event.meta.custom_data;

      const userId = customData.userId;
      const cartId = customData.cartId;
      const shippingAddress = JSON.parse(customData.shippingAddress);

      const lemonsqueezyOrderId = orderData.identifier;

      const existingOrder = await Order.findOne({
        lemonsqueezyOrderId,
      });

      if (existingOrder) {
        console.log("Duplicate webhook ignored");
        return res.status(200).send("Order already processed");
      }

      const cart = await Cart.findById(cartId);

      if (!cart) {
        return res.status(404).send("Cart not found");
      }

      const order = await Order.create({
        user: userId,
        orderItems: cart.products,
        shippingAddress,
        totalPrice: cart.totalPrice,
        paymentStatus: "paid",
        isPaid: true,
        paidAt: new Date(),
        lemonsqueezyOrderId,
        paymentDetails: {
          lemonsqueezyOrderId,
          customerEmail: orderData.user_email,
        },
      });

      cart.products = [];
      cart.totalPrice = 0;
      await cart.save();

      // console.log("Order created:", order._id);
    }

    res.status(200).send("Webhook received");
  } catch (error) {
    console.error(error);
    res.status(500).send("Webhook failed");
  }
});

module.exports = webhookRouter;

// webhookRouter.post("/lemonsqueezy", async (req, res) => {
//   try {
//     const event = req.body;

//     console.log("Webhook received:", event.meta.event_name);

//     if (event.meta.event_name === "order_created") {
//       const orderData = event.data;

//       console.log("Payment confirmed for order:", orderData.id);

//       // Here we will later create order in DB
//     }

//     res.status(200).send("Webhook received");
//   } catch (error) {
//     console.error("Webhook error:", error);

//     res.status(500).send("Webhook failed");
//   }
// });
