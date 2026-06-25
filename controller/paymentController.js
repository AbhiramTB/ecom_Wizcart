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

        // Fetch products and calculate totalPrice for each item

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
              status: "pending", // Default status for each product
              price: singleProduct.price, // Include price from the product collection
              productPrice: productPrice, // Calculate total price for this product
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
          // Correct the balance update logic
          let updatedBalance = balance - savedOrder.finalPrice;

          const walletUpdate = await Wallet.updateOne(
            { user_id: new mongoose.Types.ObjectId(req.session.user_id) }, // Query by user ID
            {
              $set: { balance: updatedBalance }, // Update balance
              $push: {
                // Add new transaction to the array
                transactions: {
                  amount: savedOrder.finalPrice, // Use savedOrder.finalPrice here
                  type: "debited",
                  description: `${savedOrder.finalPrice} debited from wallet`, // Use savedOrder.finalPrice here as well
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
      // Assuming user ID is stored in session

      if (!userId) {
        return res
          .status(HttpStatus.UNAUTHORIZED)
          .json({ success: false, message: USER_MESSAGES.UNAUTHORIZED });
      }

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

      // Fetch products and calculate totalPrice for each item

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
            status: "pending", // Default status for each product
            price: singleProduct.price, // Include price from the product collection
            productPrice: productPrice, // Calculate total price for this product
          };
        })
      );

      let paymentStatus = "pending";
      if (PaymentMethod === "razorpay") {
        paymentStatus = "failed";
      }

      // Create new order
      const order = new Order({
        user_id: userId,
        name: userData.name,
        email: userData.email,
        status: "pending",
        shipment_address: orderAddress,
        product: orderProducts,
        paymentMethod: PaymentMethod,
        Payment: paymentStatus,
        totalPrice: price.totalPrice,
        discount: price.discount,
        finalPrice: price.finalPrice,
        coupon: cartProduct.coupon,
      });

      savedOrder = await order.save();

      if (PaymentMethod === "COD") {
        // Update product stock
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

        // Clear the cart
        await Cart.deleteOne({ user_id: userId });

        res.status(HttpStatus.CREATED).json({
          success: true,
          message: PAYMENT_MESSAGES.ORDER_CREATED,
          order: savedOrder,
        });
      } else if (PaymentMethod === "razorpay") {
        // Create Razorpay order
        const razorpayOrder = await instance.orders.create({
          amount: price.finalPrice * 100, // Amount in paise
          currency: "INR",
          receipt: savedOrder._id.toString(), // Ensure this is a string
          payment_capture: "1",
        });

        res.status(HttpStatus.CREATED).json({
          success: true,
          order: savedOrder,
          razorpayOrder: razorpayOrder,
        });
      }
    }
  } catch (error) {
    console.error("Error creating order:", error.stack); // Log the stack trace
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: ERROR_MESSAGES.SERVER_ERROR });
  }
};




const verifyPayment = async (req, res) => {
  const { payment_id, order_id, signature } = req.body;

  try {
    // Generate the expected signature
    const generatedSignature = crypto
      .createHmac("sha256", RAZORPAY_SECRET_KEY)
      .update(`${order_id}|${payment_id}`)
      .digest("hex");

    // Log received data and generated signature
    console.log("Received payment details:", {
      payment_id,
      order_id,
      signature,
    });
    console.log("Generated signature:", generatedSignature);

    // Verify the signature
    if (generatedSignature !== signature) {
      console.log("Payment verification failed");
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: PAYMENT_MESSAGES.VERIFICATION_FAILED,
        status: "failure",
      });
    }

    // Log payment verification success
    console.log("Payment verification successful");

    // Fetch payment details from Razorpay
    const paymentResponse = await axios.get(
      `https://api.razorpay.com/v1/payments/${payment_id}`,
      {
        auth: {
          username: RAZORPAY_ID_KEY,
          password: RAZORPAY_SECRET_KEY,
        },
      }
    );

    // Extract payment method and source
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
      // Add cases for other payment methods
      default:
        console.log("Unknown payment method");
        razorpayPaymentMethod = "unknown";
        paymentSource = null;
        break;
    }

    // Log payment details
    console.log("Payment details:", paymentResponse.data);

    // Update order with payment method and source
    const updateOrder = await Order.updateOne(
      { _id: savedOrder._id },
      {
        $set: {
          paymentMethod: razorpayPaymentMethod,
          paymentSource: paymentSource,
          payment: "success",
        },
      }
    );
    console.log("Order update result:", updateOrder);

    // Find cart for the user
    const cartProduct = await Cart.findOne({ user_id: req.session.user_id });
    if (!cartProduct || cartProduct.Product.length === 0) {
      console.log("Cart is empty");
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: PAYMENT_MESSAGES.CART_EMPTY,
        status: "failure",
      });
    }

    // Process cart and update inventory
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

    // Clear the cart
    await Cart.deleteOne({ user_id: req.session.user_id });

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

    const updateOrder = await Order.updateOne(
      { _id: savedOrder._id },
      {
        $set: {
          paymentMethod: razorpayPaymentMethod,
          paymentSource: paymentSource,
          payment: "Failed",
        },
      }
    );
  }
};

const completePayment = async (req, res) => {
    try {
      const { orderId } = req.body;
  
      // Validate the orderId
      if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
        return res.status(HttpStatus.BAD_REQUEST).json({ message: PAYMENT_MESSAGES.INVALID_ORDER_ID });
      }
  
      // Fetch the order from the database
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(HttpStatus.NOT_FOUND).json({ message: PAYMENT_MESSAGES.ORDER_NOT_FOUND });
      }
  
      // Validate order total amount
      const amountInPaise = Number(order.finalPrice) * 100;
      if (isNaN(amountInPaise) || amountInPaise <= 0) {
        return res.status(HttpStatus.BAD_REQUEST).json({ message: PAYMENT_MESSAGES.INVALID_ORDER_AMOUNT });
      }
  
      // Create a Razorpay order
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
  
      // Update the order with the Razorpay order ID
      order.razorpayOrderId = razorpayOrder.id;
      await order.save();
  
      // Send response to client
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
  
  
     


      // Generate the expected signature
      const generatedSignature = crypto
        .createHmac("sha256", RAZORPAY_SECRET_KEY)
        .update(`${order_id}|${payment_id}`)
        .digest("hex");
  
      // Verify the signature
      if (generatedSignature !== signature) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: PAYMENT_MESSAGES.VERIFICATION_FAILED,
          status: "failure",
        });
      }
  
      // Fetch payment details from Razorpay
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
        // Add cases for other payment methods
        default:
          razorpayPaymentMethod = "unknown";
          paymentSource = null;
          break;
      }
  
      // Update order with payment method and source
      const updateOrder = await Order.updateOne(
        {_id: orderObjid }, // Use razorpayOrderId instead of _id
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
