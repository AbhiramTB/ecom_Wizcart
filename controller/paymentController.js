const User = require("../model/userModel");
const Product = require("../model/productModel");
const Cart = require("../model/cartModel");
const Order = require("../model/orders.model");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const env = require("../lib/env");
const axios = require("axios");
const { log, error } = require("console");
const object_id = require("mongoose").Types.ObjectId;
const Wallet = require("../model/walletModel");
const { cart } = require("./userController");
const mongoose = require("mongoose");
const { HttpStatus } = require("../constants/httpStatus");
const { USER_MESSAGES, PAYMENT_MESSAGES, ERROR_MESSAGES } = require("../constants/messages");

const { RAZORPAY_ID_KEY, RAZORPAY_SECRET_KEY } = env;

const instance = new Razorpay({
  key_id: RAZORPAY_ID_KEY,
  key_secret: RAZORPAY_SECRET_KEY,
});

let savedOrder;

const createOrder = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const { orderAddress, PaymentMethod } = req.body;

    console.log(PaymentMethod);

    const price = await Cart.findOne({ user_id: req.session.user_id });

    if (PaymentMethod === "Wizwallet") {
      const wallet = await Wallet.findOne({
        user_id: new object_id(req.session.user_id),
      });
      const cartProduct = await Cart.findOne({ user_id: userId });

      const balance = parseInt(wallet.balance, 10);
      const orderTotal = parseInt(cartProduct.finalPrice, 10);
      console.log(balance);
      console.log(orderTotal);

      if (balance >= orderTotal) {
        // Find user data
        const userData = await User.findById(userId);
        if (!userData) {
          return res
            .status(HttpStatus.NOT_FOUND)
            .json({ success: false, message: USER_MESSAGES.NOT_FOUND });
        }

        // Find cart for the user
        const cartProduct = await Cart.findOne({ user_id: userId });
        if (!cartProduct || cartProduct.Product.length === 0) {
          return res
            .status(HttpStatus.BAD_REQUEST)
            .json({ success: false, message: PAYMENT_MESSAGES.CART_EMPTY });
        }



        const orderProducts = await Promise.all(
          cartProduct.Product.map(async (item) => {
            const singleProduct = await Product.findById(item.productId);
            if (!singleProduct) {
              throw new Error(`Product with ID ${item.productId} not found`);
            }
            const productPrice = item.quantity * singleProduct.price;

            return {
              productId: item.productId,
              quantity: item.quantity,
              status: "pending", 

              price: singleProduct.price,

              productPrice: productPrice,

            };
          })
        );

        const order = new Order({
          user_id: userId,
          name: userData.name,
          email: userData.email,
          status: "pending",
          shipment_address: orderAddress,
          product: orderProducts,
          paymentMethod: PaymentMethod,
          Payment: "pending",
          totalPrice: price.totalPrice,
          discount: price.discount,
          finalPrice: price.finalPrice,
          coupon: cartProduct.coupon,
        });

        const savedOrder = await order.save();

        if (savedOrder) {

          let updatedBalance = balance - savedOrder.finalPrice;

          const walletUpdate = await Wallet.updateOne(
            { user_id: new mongoose.Types.ObjectId(req.session.user_id) }, 

            {
              $set: { balance: updatedBalance }, 

              $push: {

                transactions: {
                  amount: savedOrder.finalPrice, 

                  type: "debited",
                  description: `${savedOrder.finalPrice} debited from wallet`, 

                },
              },
            }
          );
        }

        await Promise.all(
          cartProduct.Product.map(async (item) => {
            const product = await Product.findById(item.productId);
            if (product) {
              product.in_stock -= item.quantity;
              await product.save();
            } else {
              console.log(`Product not found: ${item.productId}`);
            }
          })
        );

        await Cart.deleteOne({ user_id: userId });

        return res.status(HttpStatus.CREATED).json({
          success: true,
          message: PAYMENT_MESSAGES.ORDER_CREATED,
          order: savedOrder,
        });
      } else {
        console.log("Insufficient balance");
        return res.status(HttpStatus.BAD_REQUEST).json({ message: PAYMENT_MESSAGES.INSUFFICIENT_BALANCE });
      }
    } else {


      if (!userId) {
        return res
          .status(HttpStatus.UNAUTHORIZED)
          .json({ success: false, message: USER_MESSAGES.UNAUTHORIZED });
      }


      const userData = await User.findById(userId);
      if (!userData) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ success: false, message: USER_MESSAGES.NOT_FOUND });
      }


      const cartProduct = await Cart.findOne({ user_id: userId });
      if (!cartProduct || cartProduct.Product.length === 0) {
        return res
          .status(HttpStatus.BAD_REQUEST)
          .json({ success: false, message: PAYMENT_MESSAGES.CART_EMPTY });
      }



      const orderProducts = await Promise.all(
        cartProduct.Product.map(async (item) => {
          const singleProduct = await Product.findById(item.productId);
          if (!singleProduct) {
            throw new Error(`Product with ID ${item.productId} not found`);
          }
          const productPrice = item.quantity * singleProduct.price;

          return {
            productId: item.productId,
            quantity: item.quantity,
            status: "pending", 

            price: singleProduct.price, 

            productPrice: productPrice, 
          };
        })
      );

      let paymentStatus = "pending";
      if (PaymentMethod === "razorpay") {
        paymentStatus = "failed";
      }


      const order = new Order({
        user_id: userId,
        name: userData.name,
        email: userData.email,
        status: "pending",
        shipment_address: orderAddress,
        product: orderProducts,
        paymentMethod: PaymentMethod,
        payment: paymentStatus,
        totalPrice: price.totalPrice,
        discount: price.discount,
        finalPrice: price.finalPrice,
        coupon: cartProduct.coupon,
      });

      savedOrder = await order.save();

      // Decrement stock and clear cart immediately for all payment methods
      await Promise.all(
        cartProduct.Product.map(async (item) => {
          const product = await Product.findById(item.productId);
          if (product) {
            product.in_stock -= item.quantity;
            await product.save();
          } else {
            console.log(`Product not found: ${item.productId}`);
          }
        })
      );
      await Cart.deleteOne({ user_id: userId });

      if (PaymentMethod === "COD") {
        res.status(HttpStatus.CREATED).json({
          success: true,
          message: PAYMENT_MESSAGES.ORDER_CREATED,
          order: savedOrder,
        });
      } else if (PaymentMethod === "razorpay") {
        const calculatedAmount = Math.round(price.finalPrice * 100);
        console.log("=== [RAZORPAY ORDER CREATION] ===");
        console.log("Cart Final Price (INR):", price.finalPrice);
        console.log("Calculated Amount (Paise):", calculatedAmount);
        console.log("Receipt ID:", savedOrder._id.toString());

        try {
          const razorpayOrder = await instance.orders.create({
            amount: calculatedAmount,
            currency: "INR",
            receipt: savedOrder._id.toString(),
            payment_capture: "1",
          });

          console.log("✅ Razorpay Order Created Successfully:", razorpayOrder);

          savedOrder.razorpayOrderId = razorpayOrder.id;
          await savedOrder.save();

          return res.status(HttpStatus.CREATED).json({
            success: true,
            order: savedOrder,
            razorpayOrder: razorpayOrder,
          });
        } catch (rzpErr) {
          console.error("🚨 Razorpay API Order Creation Failed!");
          console.error("Status Code:", rzpErr.statusCode);
          console.error("Error Code:", rzpErr.error ? rzpErr.error.code : undefined);
          console.error("Description:", rzpErr.error ? rzpErr.error.description : rzpErr.message);
          console.error("Full Error Object:", JSON.stringify(rzpErr, null, 2));

          return res.status(HttpStatus.BAD_REQUEST).json({
            success: false,
            message: `Razorpay Error: ${rzpErr.error ? rzpErr.error.description : rzpErr.message}`,
            errorDetails: rzpErr
          });
        }
      }
    }
  } catch (error) {
    console.error("Global Error creating order:", error);
    if (error.stack) console.error(error.stack);

    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ 
      success: false, 
      message: error.message || ERROR_MESSAGES.SERVER_ERROR 
    });
  }
};




const verifyPayment = async (req, res) => {
  const { payment_id, order_id, signature } = req.body;
  let order;

  try {

    const generatedSignature = crypto
      .createHmac("sha256", RAZORPAY_SECRET_KEY)
      .update(`${order_id}|${payment_id}`)
      .digest("hex");


    console.log("Received payment details:", {
      payment_id,
      order_id,
      signature,
    });
    console.log("Generated signature:", generatedSignature);


    if (generatedSignature !== signature) {
      console.log("Payment verification failed");
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: PAYMENT_MESSAGES.VERIFICATION_FAILED,
        status: "failure",
      });
    }


    order = await Order.findOne({ razorpayOrderId: order_id });
    if (!order) {
      console.log("Order not found for Razorpay order_id:", order_id);
      return res.status(HttpStatus.NOT_FOUND).json({
        message: "Order not found",
        status: "failure",
      });
    }


    console.log("Payment verification successful");


    const paymentResponse = await axios.get(
      `https://api.razorpay.com/v1/payments/${payment_id}`,
      {
        auth: {
          username: RAZORPAY_ID_KEY,
          password: RAZORPAY_SECRET_KEY,
        },
      }
    );


    let razorpayPaymentMethod;
    let paymentSource;

    switch (paymentResponse.data.method) {
      case "wallet":
        razorpayPaymentMethod = "wallet";
        paymentSource = paymentResponse.data.wallet;
        break;
      case "netbanking":
        razorpayPaymentMethod = "netbanking";
        paymentSource = paymentResponse.data.bank;
        break;

      default:
        console.log("Unknown payment method");
        razorpayPaymentMethod = "unknown";
        paymentSource = null;
        break;
    }


    console.log("Payment details:", paymentResponse.data);


    const updateOrder = await Order.updateOne(
      { _id: order._id },
      {
        $set: {
          paymentMethod: razorpayPaymentMethod,
          paymentSource: paymentSource,
          payment: "success",
        },
      }
    );
    console.log("Order update result:", updateOrder);

    res.json({
      message: PAYMENT_MESSAGES.VERIFICATION_SUCCESS,
      status: "success",
      paymentDetails: paymentResponse.data,
    });
  } catch (error) {
    console.error("Error during payment verification:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: PAYMENT_MESSAGES.VERIFICATION_ERROR,
      status: "failure",
    });

    const targetId = order ? order._id : (typeof savedOrder !== 'undefined' && savedOrder ? savedOrder._id : null);
    if (targetId) {
      await Order.updateOne(
        { _id: targetId },
        {
          $set: {
            paymentMethod: razorpayPaymentMethod || "razorpay",
            paymentSource: paymentSource || null,
            payment: "Failed",
          },
        }
      );
    }
  }
};

const completePayment = async (req, res) => {
    try {
      const { orderId } = req.body;
  

      if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
        return res.status(HttpStatus.BAD_REQUEST).json({ message: PAYMENT_MESSAGES.INVALID_ORDER_ID });
      }
  

      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(HttpStatus.NOT_FOUND).json({ message: PAYMENT_MESSAGES.ORDER_NOT_FOUND });
      }
  

      const amountInPaise = Number(order.finalPrice) * 100;
      if (isNaN(amountInPaise) || amountInPaise <= 0) {
        return res.status(HttpStatus.BAD_REQUEST).json({ message: PAYMENT_MESSAGES.INVALID_ORDER_AMOUNT });
      }
  

      const razorpayOrder = await instance.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt: `order_rcptid_${order._id}`,
        notes: {
          order_id: order._id.toString(),
        },
      });
  
      if (!razorpayOrder) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: PAYMENT_MESSAGES.RAZORPAY_ORDER_FAILED });
      }
  

      order.razorpayOrderId = razorpayOrder.id;
      await order.save();
  

      res.status(HttpStatus.OK).json({
        key: RAZORPAY_ID_KEY,
        order_id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
      });
    } catch (error) {
      console.error("Error completing payment:", error);
      console.log(error.message)
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
    }
  };
  


  
  const captureContinuePayment = async (req, res) => {
    try {
      const { payment_id, order_id, signature,orderObjid} = req.body;
  
  
     



      const generatedSignature = crypto
        .createHmac("sha256", RAZORPAY_SECRET_KEY)
        .update(`${order_id}|${payment_id}`)
        .digest("hex");
  

      if (generatedSignature !== signature) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: PAYMENT_MESSAGES.VERIFICATION_FAILED,
          status: "failure",
        });
      }
  

      const paymentResponse = await axios.get(
        `https://api.razorpay.com/v1/payments/${payment_id}`,
        {
          auth: {
            username: RAZORPAY_ID_KEY,
            password: RAZORPAY_SECRET_KEY,
          },
        }
      );
  
      let razorpayPaymentMethod;
      let paymentSource;
  
      switch (paymentResponse.data.method) {
        case "wallet":
          razorpayPaymentMethod = "wallet";
          paymentSource = paymentResponse.data.wallet;
          break;
        case "netbanking":
          razorpayPaymentMethod = "netbanking";
          paymentSource = paymentResponse.data.bank;
          break;

        default:
          razorpayPaymentMethod = "unknown";
          paymentSource = null;
          break;
      }
  

      const updateOrder = await Order.updateOne(
        {_id: orderObjid }, 

        {
          $set: {
            paymentMethod: razorpayPaymentMethod,
            paymentSource: paymentSource,
            payment: "success",
          },
        }
      );
  
      res.json({
        message: PAYMENT_MESSAGES.VERIFICATION_SUCCESS,
        status: "success",
        paymentDetails: paymentResponse.data,
      });
    } catch (error) {
      console.error("Error during payment verification:", error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: PAYMENT_MESSAGES.VERIFICATION_ERROR,
        status: "failure",
      });
    }
  };
  

module.exports = {
  createOrder,
  verifyPayment,
  completePayment,
  captureContinuePayment,
};
