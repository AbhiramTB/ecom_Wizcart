const { sanitizeUser } = require("../lib/userSanitizer");
const { getCartQuantity } = require("../lib/cartHelper");
const { log, error } = require("console");
const object_id = require('mongoose').Types.ObjectId;
const WishList = require('../model/wishlistModel'); 
const User = require("../model/userModel");
const Product = require("../model/productModel");
const Brand = require("../model/brandModel");
const Cart = require("../model/cartModel");
const nodemailer = require("nodemailer");
const Mailgen = require("mailgen");
const bcrypt = require("bcryptjs");
const { render } = require("ejs");
const { set } = require("mongoose");
const mongoose = require("mongoose");
const Order = require("../model/orders.model");
const { HttpStatus } = require("../constants/httpStatus");
const { USER_MESSAGES, PRODUCT_MESSAGES, CATEGORY_MESSAGES, COUPON_MESSAGES, PAYMENT_MESSAGES, ERROR_MESSAGES } = require("../constants/messages");
const Category = require("../model/categoryModel");
const Coupons=require('../model/couponModel')
const wishlist=require('../model/wishlistModel');
const wishlistModel = require("../model/wishlistModel");
const env = require("../lib/env");
const { RAZORPAY_ID_KEY, RAZORPAY_SECRET_KEY } = env;
const Wallet=require('../model/walletModel')
const Review = require("../model/reviewModel");
const CategoryOffer = require("../model/categoryOfferModel");
const PDFDocument = require('pdfkit');
const fs=require('fs')

const homeLogin = async (req, res) => {
  try {
    const products = await Product.find({}).limit(8);
    console.log(products)
    console.log('--------------0987-----------------')
    const toast = req.flash("info");
    if (products) {
      if (req.session.user_id) {
        const user = await User.findById(req.session.user_id);

        if (user) {
          const cartQuantity = await getCartQuantity(req.session.user_id);
          console.log("This is the new cart quantity: " + cartQuantity);

          res.render("user/home", {
            products: products,
            user: sanitizeUser(user),
            toast,
            cartQuantity,
          });
        } else {
          res.redirect("/login");
        }
      } else {
        res.render("user/home", { products: products, user: typeof user !== "undefined" ? sanitizeUser(user) : null, toast });
      }
    } else {
      res.status(404).render("notFound");
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).render("error", { message: "Server Error" });
  }
};

const home = async (req, res) => {
  try {
    const products = await Product.find({}).limit(8);
      console.log(products)
      console.log('-----------------------')
    if (products) {
      if (req.session.user_id) {
        const user = await User.findById(req.session.user_id);

        if (user) {
          const toast = ["LOGIN SUCCESSFULLY ✅"];
          res.render("user/home", { products: products, user: sanitizeUser(user), toast });
        } else {
          res.redirect("/login");
        }
      } else {
        let toast = req.flash("info");
        if (toast.length === 0) {
          console.log("No toast messages");
          toast = [];
          res.render("user/home", { products: products, user: typeof user !== "undefined" ? sanitizeUser(user) : null, toast });
        }
      }
    } else {
      res.status(404).render("notFound");
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).render("error", { message: "Server Error" });
  }
};

const shopmore = async (req, res) => {
  try {
    const pageNum = parseInt(req.query.page, 10) || 1;
    const perpage = 6;

    const searchQuery = req.query.search ? req.query.search.trim() : "";
    const minPrice = req.query.minPrice
      ? parseFloat(req.query.minPrice)
      : undefined;
    const maxPrice = req.query.maxPrice
      ? parseFloat(req.query.maxPrice)
      : undefined;
    const queryBrand = req.query.brand ? req.query.brand.trim() : "";
    const queryCategory = req.query.category ? req.query.category.trim() : "";
    const sortOption = req.query.sort || "";

    let query = {};

    if (searchQuery) {
      const matchingBrands = await Brand.find({
        brand_name: new RegExp(searchQuery, "i"),
        isBlocked: false,
      }).select("_id");
      const brandIds = matchingBrands.map((b) => b._id);

      query.$or = [
        { product_name: new RegExp(searchQuery, "i") },
        { brand: { $in: brandIds } },
      ];
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      query.price = {};
      if (minPrice !== undefined) query.price.$gte = minPrice;
      if (maxPrice !== undefined) query.price.$lte = maxPrice;
    }

    if (queryBrand && mongoose.Types.ObjectId.isValid(queryBrand)) {
      query.brand = new mongoose.Types.ObjectId(queryBrand);
    }

    if (queryCategory) {
      const categoryDoc = await Category.findOne({ category_name: queryCategory });
      if (categoryDoc) {
        query.category_name = categoryDoc._id;
      } else {
        query.category_name = null;
      }
    }

    const productCount = await Product.countDocuments(query);
    const totalPages = Math.ceil(productCount / perpage);

    let sort = {};
    switch (sortOption) {
      case "newArrivals":
        sort = { createdAt: -1 }; 
        break;
      case "lowtohigh":
        sort = { price: 1 };
        break;
      case "hightolow":
        sort = { price: -1 };
        break;
      case "atoz":
        sort = { product_name: 1 };
        break;
      case "ztoa":
        sort = { product_name: -1 };
        break;
      default:
        sort = { _id: -1 }; 
    }

    const products = await Product.find(query)
      .sort(sort)
      .skip((pageNum - 1) * perpage)
      .limit(perpage)
      .populate('category_name')
      .populate('brand');

    const category = await Category.find({ Hide_category: 0 });

    const brands = await Brand.find({ isBlocked: false }).sort({ brand_name: 1 });

    let user = null;
    let cartQuantity = 0;

    if (req.session.user_id) {
      user = await User.findOne({ _id: req.session.user_id });

      cartQuantity = await getCartQuantity(req.session.user_id);
    }

    res.render("user/shopMore", {
      products,
      category,
      brands,
      searchQuery,
      minPrice,
      maxPrice,
      queryBrand,
      queryCategory,
      sortOption,
      pageNum,
      totalPages,
      user: sanitizeUser(user),
      cartQuantity,
    });
  } catch (error) {
    console.error("Error in shopmore:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(ERROR_MESSAGES.SERVER_ERROR);
  }
};


const login = async (req, res) => {
  try {
    const toast = req.flash("info");
    res.render("user/login", { toast });
  } catch (err) {
    console.error(err.message);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(ERROR_MESSAGES.SERVER_ERROR);
  }
};


const loginData = async (req, res) => {
  try {
    const { email, password } = req.body;


    const userValid = await User.findOne({ email: email });

    if (!userValid) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: USER_MESSAGES.INVALID_EMAIL_OR_PASSWORD });
    }


    if (userValid.is_ban === 1) {
      return res
        .status(HttpStatus.OK)
        .json({ redirectUrl: "user-block", message: "Login successful!" });
    }


    if (userValid.googleId > 0) {
      return res
        .status(HttpStatus.OK)
        .json({ redirectUrl: "/signup/google", message: "Login successful!" });
    }


    const isMatch = await bcrypt.compare(password, userValid.password);
    if (isMatch) {

      req.session.user_id = userValid._id;
      console.log(req.session.user_id);
      req.flash("info", "✅ login successful");
      return res
        .status(HttpStatus.OK)
        .json({ redirectUrl: "/home", message: "Login successful!" });
    } else {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: USER_MESSAGES.INVALID_EMAIL_OR_PASSWORD });
    }
  } catch (err) {
    console.error(err.message);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .render("user/login", { message: ERROR_MESSAGES.SERVER_ERROR, toast: [] });
  }
};


const userBlocked = (req, res) => {
  res.render("user/ban");
};



const signup = async (req, res) => {
  try {
    const toast = [];
    res.render("user/signUp", { toast });
  } catch (err) {
    console.error(err.message);
  }
};

let otpEmail;

let otpVerification;
let password;
let email;
let name;



const signupData = async (req, res) => {
  try {
    const unique = await User.findOne({ email: req.body.email });

    if (unique) {
      res.render("user/signUp", { message: "email is already exists" });
      return;
    }
    name = req.body.name;
    email = req.body.email;
    otpEmail = email;

    console.log(`Email: ${email}`); 


    if (email && req.body.password) {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);
      password = hashedPassword;

      console.log(`Hashed Password: ${hashedPassword}`);

      res.redirect("/signupOtp");
    } else {
      console.error("Email or password not provided.");
      res.render("user/signUp");
    }
  } catch (err) {
    console.error(err.message);
  }
};


const otpSending = (req, res) => {
  try {
    if (otpEmail) {
      const sendOtp = () => {

        const generateOTP = () => Math.floor(100000 + Math.random() * 900000);
        let otp = generateOTP();
        otpVerification = otp;
        console.log(`Generated OTP: ${otp}`);
        console.log(`Sending OTP to: ${otpEmail}`);


        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: env.EMAIL_SERVICE_EMAIL,
            pass: env.EMAIL_SERVICE_PASSWORD,
          },
        });

    
        const mailGenerator = new Mailgen({
          theme: "default",
          product: {
            name: "WIZCART",
            link: "http://mailgen.js/",
          },
        });

        const emailContent = {
          body: {
            name: otpEmail,
            intro: "OTP verification",
            table: {
              data: [
                {
                  otp: otp,
                },
              ],
            },
            outro: "Welcome to Wizcart!",
          },
        };

        const mail = mailGenerator.generate(emailContent);

        const message = {
          from: env.EMAIL_SERVICE_EMAIL,
          to: otpEmail,
          subject: "OTP verification",
          html: mail,
        };

        transporter
          .sendMail(message)
          .then(() => {
            const toast = [`OTP has been sent to ${otpEmail} ✅`];
            res.render("user/otpSignup", { toast });
            console.log("Successfully sent message.");
            const startTime = Date.now();
            const duration = 65 * 1000;

            console.log(
              `Timer started at: ${new Date(startTime).toLocaleTimeString()}`
            );

            setTimeout(() => {
              const currentTime = Date.now();
              console.log(
                `otp send in mail ${new Date(currentTime).toLocaleTimeString()}`
              );
              console.log(
                `OTP expire in : ${(currentTime - startTime) / 1000} seconds`
              );
              otpVerification = -1;
            }, duration);
          })
          .catch((err) => {
            console.error(err.message);
          });
      };

      sendOtp();
    } else {
      res.render("notFound");
    }
  } catch (error) {
    console.log(error.message);
  }
};

// OTP POST
const otpData = async (req, res) => {
  try {
    let otpArr = req.body.otp;
    inputOtp = parseInt(otpArr.join(""));

    console.log(inputOtp);

    if (otpVerification !== inputOtp) {
      const toast = ["𝙿𝙻𝙴𝙰𝚂𝙴 𝙴𝙽𝚃𝙴𝚁 𝙰 𝚅𝙰𝙻𝙸𝙳 𝙾𝚃𝙿"];

      res.render("user/otpSignup", {
        message: "𝙿𝙻𝙴𝙰𝚂𝙴 𝙴𝙽𝚃𝙴𝚁 𝙰 𝚅𝙰𝙻𝙸𝙳 𝙾𝚃𝙿",
        toast,
      });
      return;
    }

    if (otpVerification === inputOtp) {
      otpVerification = null;
      otpEmail = null;

      const signdata = new User({
        name: name,
        email: email,
        password: password,
        is_admin: 0,
        is_ban: 0,
        googleId: 0,
        address: [],
      });

      const singupdataSucess = await signdata.save();
      if (singupdataSucess) {
        req.flash("info", "𝚜𝚒𝚐𝚗 𝚞𝚙 𝚜𝚞𝚌𝚌𝚎𝚜𝚜𝚏𝚞𝚕𝚕𝚢");

        res.redirect("/login");
      }
    } else {
      console.error("OTP does not match.");
      // Handle invalid OTP
    }
  } catch (error) {
    console.log(error.message);
  }
};

const singleProduct = async (req, res) => {
  try {

    const singleId = req.params.id;




    const existingWishlist = await WishList.findOne({
      user_id: req.session.user_id,
      productId: singleId
    });

    console.log(singleId);

    const singleProduct = await Product.findOne({ _id: singleId }).populate('category_name').populate('brand');

    if (!singleProduct) {
      return res.status(HttpStatus.NOT_FOUND).send(PRODUCT_MESSAGES.NOT_FOUND);
    }

    console.log(singleProduct.product_name);

    const cartExist = await Cart.findOne({
      user_id: req.session.user_id,
      "Product.productId": singleId,
    });

    let isCartexist = 0;

    if (cartExist) {
      isCartexist = 1;
    }

    console.log(isCartexist);

    const user = await User.findOne({
      _id: req.session.user_id
    });

    const cartQuantity = await getCartQuantity(req.session.user_id);

    const reviews = await Review.find({ productId: singleId }).populate('userId');

    const categoryOffer = await CategoryOffer.findOne({ category_id: singleProduct.category_name._id });
    const cat_discount = categoryOffer ? categoryOffer.discount : 0;
    const prod_discount = singleProduct.offer_price || 0;
    const hasCategoryOffer = cat_discount > 0 && cat_discount > prod_discount;

    res.render("user/singleProduct", {
      singleProduct,
      isCartexist,
      existingWishlist,
      reviews,
      hasCategoryOffer,
      user: sanitizeUser(user) || "",
      cartQuantity: cartQuantity || 0,
    });

  } catch (error) {

    console.log(error.message);

    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(error.message);
  }
};


const logout = async (req, res) => {
  try {
    console.log(req.session.user_id); 

    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session during logout:", err.message);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(USER_MESSAGES.LOGOUT_ERROR);
      }
      res.redirect("/");
    });
  } catch (error) {
    console.log(error.message);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(ERROR_MESSAGES.SERVER_ERROR);
  }
};

const profile = async (req, res) => {
  try {
    if (req.session.user_id) {
      const userDetails = await User.findById(req.session.user_id);
      res.render("user/profile", { user: sanitizeUser(userDetails), toast: [] });
    } else {
      req.flash("info", " 🚨 LOGIN FIRST ");
      res.redirect("/wizcart");
    }
  } catch (error) {}
};

const ProfileNameUpdate = async (req, res) => {
  try {
    const newName = req.body.updateName;

    const updateStatus = await User.updateOne(
      { _id: req.session.user_id },
      { $set: { name: newName } }
    );

    if (updateStatus) {
      res.json({ message: "Form data received successfully", name: name });
      console.log("hello");
    } else {
      res.json({ success: false, message: "No changes made" });
    }
  } catch (error) {}
};

let newOtp;
let newEmail;
const ProfileUpdateEmail = async (req, res) => {
  try {
    newEmail = req.body.updateEmail;

    const sendOtp = () => {

      const generateOTP = () => Math.floor(100000 + Math.random() * 900000);
      newOtp = generateOTP();

      otpVerification = newOtp;
      console.log(`Generated OTP: ${newOtp}`);
      console.log(`Sending OTP to: ${newEmail}`); 


      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: env.EMAIL_SERVICE_EMAIL,
          pass: env.EMAIL_SERVICE_PASSWORD,
        },
      });

      const mailGenerator = new Mailgen({
        theme: "default",
        product: {
          name: "WIZCART",
          link: "http://mailgen.js/",
        },
      });

      const emailContent = {
        body: {
          name: otpEmail,
          intro: " OTP verification for Update email ",
          table: {
            data: [
              {
                otp: newOtp,
              },
            ],
          },
          outro: "Welcome to Wizcart!",
        },
      };

      const mail = mailGenerator.generate(emailContent);

      const message = {
        from: env.EMAIL_SERVICE_EMAIL,
        to: newEmail,
        subject: "OTP verification",
        html: mail,
      };

      transporter
        .sendMail(message)
        .then(() => {
          const startTime = Date.now();
          const duration = 130 * 1000;

          console.log(
            `Timer started at: ${new Date(startTime).toLocaleTimeString()}`
          );

          res.json({
            message: "Form data received successfully",
            newEmail: newEmail,
          });

          setTimeout(() => {
            const currentTime = Date.now();
            console.log(
              `otp send in mail ${new Date(currentTime).toLocaleTimeString()}`
            );
            console.log(
              `OTP expire in : ${(currentTime - startTime) / 1000} seconds`
            );
            otpVerification = -1;
          }, duration);
        })
        .catch((err) => {
          console.error(err.message);
        });
    };

    sendOtp();
  } catch (error) {}
};

const profileOtpsumbit = async (req, res) => {
  try {
    const enterdOtp = req.body.OTP;

    if (newOtp == enterdOtp) {
      console.log(req.session.user_id);
      const updateStatus = await User.updateOne(
        { _id: req.session.user_id },
        { $set: { email: newEmail } }
      );

      if (updateStatus) {
        console.log("Email updated successfully");
        res.json({ success: true, message: "Email updated successfully" });
      }
    } else {
      console.log("OTP does not match");
      res.json({ success: false, message: "OTP does not match" });
    }
  } catch (error) {}
};

const profilenewPass = async (req, res) => {
  try {
    const { currentPass, newPass } = req.body;

    const userData = await User.findById({ _id: req.session.user_id });
    console.log(userData);

    if (!userData.password) {
      console.error(`User (${userData._id}) does not have a password`);
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: USER_MESSAGES.NO_PASSWORD_GOOGLE,
      });
    }

    const isMatch = await bcrypt.compare(currentPass, userData.password);

    if (isMatch) {
      const saltRounds = 10;
      const hashedNewPassword = await bcrypt.hash(newPass, saltRounds);
      hashedNewPassword;
      const isPasswordChanged = await User.updateOne(
        { _id: req.session.user_id },
        { $set: { password: hashedNewPassword } }
      );
      if (isPasswordChanged) {
        console.log("passwordChanged");
        return res
          .status(HttpStatus.OK)
          .json({ message: USER_MESSAGES.PASSWORD_UPDATED });
      }
    } else {
      return res.status(HttpStatus.UNAUTHORIZED).json({ error: USER_MESSAGES.PASSWORD_MISMATCH });
    }
  } catch (error) {}
};



const forgotPassword = async (req, res) => {
  try {
    res.render("user/forgotPassword");
  } catch (error) {
    console.log(error.message);
  }
};

let forgetpasswordEmail;
let ForgetOtp;

const forgotEmail = async (req, res) => {
  try {
    const { email } = req.body;
    console.log(`Received email: ${email}`);

    const accountExist = await User.findOne({ email: email });
    console.log(`Account found: ${accountExist}`);

    if (accountExist) {
      forgetpasswordEmail = email;

      const sendOtp = () => {

        const generateOTP = () => Math.floor(100000 + Math.random() * 900000);
        let otp = generateOTP();
        ForgetOtp = otp; 

        console.log(`Generated OTP: ${otp}`);
        console.log(`Sending OTP to: ${forgetpasswordEmail}`);


        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: env.EMAIL_SERVICE_EMAIL,
            pass: env.EMAIL_SERVICE_PASSWORD,
          },
        });

        const mailGenerator = new Mailgen({
          theme: "default",
          product: {
            name: "WIZCART",
            link: "http://mailgen.js/",
          },
        });

        const emailContent = {
          body: {
            name: forgetpasswordEmail,
            intro: "OTP verification",
            table: {
              data: [
                {
                  otp: otp,
                },
              ],
            },
            outro: "Welcome to Wizcart!",
          },
        };

        const mail = mailGenerator.generate(emailContent);

        const message = {
          from: env.EMAIL_SERVICE_EMAIL,
          to: forgetpasswordEmail, 

          subject: "OTP verification",
          html: mail,
        };

        transporter
          .sendMail(message)
          .then(() => {
            const toast = [`OTP has been sent to ${forgetpasswordEmail} ✅`];
            res.status(HttpStatus.OK).json({
              success: true,
              message: `OTP has been sent to ${forgetpasswordEmail}`,
              otp: otp,
            });
            console.log("Successfully sent message.");
            const startTime = Date.now();
            const duration = 65 * 1000;

            console.log(
              `Timer started at: ${new Date(startTime).toLocaleTimeString()}`
            );

            setTimeout(() => {
              const currentTime = Date.now();
              console.log(
                `OTP sent in mail at ${new Date(
                  currentTime
                ).toLocaleTimeString()}`
              );
              console.log(
                `OTP expired in : ${(currentTime - startTime) / 1000} seconds`
              );
              ForgetOtp = -1;
            }, duration);
          })
          .catch((err) => {
            console.error(err.message);
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
              success: false,
              message: USER_MESSAGES.OTP_SEND_FAILED,
            });
          });
      };

      sendOtp();
    } else {
      console.log("Email not registered");
      res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: USER_MESSAGES.EMAIL_NOT_REGISTERED,
      });
    }
  } catch (error) {
    console.error(`Error in forgotEmail function: ${error.message}`);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: ERROR_MESSAGES.AN_ERROR_OCCURRED,
    });
  }
};









const forgetRestpassword = async (req, res) => {
  try {
  } catch (error) {}
};

const loadforgetpassword = async (req, res) => {
  try {
    const { ForgotOtp, newPassword } = req.body;
  
     
    console.log(ForgetOtp);
    console.log(forgetpasswordEmail);

    if (ForgotOtp == ForgetOtp) {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      const userData = await User.updateOne(
        { email: forgetpasswordEmail },
        { $set: { password: hashedPassword } }
      );
      if (userData) {
        req.flash("info", "✅ Password Updated");
        res.redirect("/login");
      }
    }
  } catch (error) {
    console.log(error.message);
  }
};

const manageaddress = async (req, res) => {
  try {
    const data = await User.findById({ _id: req.session.user_id });
    console.log();
    let toast = [];
    res.render("user/manageAddress", { user: sanitizeUser(data), toast });
  } catch (error) {}
};

const newaddress = async (req, res) => {
  try {
    const {
      name,
      mobile,
      pincode,
      locality,
      address,
      city,
      state,
      landmark,
      altmobile,
      addresstype,
    } = req.body;

    const newaddress = {
      name,
      mobile,
      pincode,
      locality,
      address,
      city,
      state,
      landmark,
      altmobile,
      addresstype,
      is_active: 0,
    };

    res.status(HttpStatus.OK).json({ message: USER_MESSAGES.ADDRESS_ADDED });
    console.log("Received address:", newaddress);

    console.log(req.session.user_id);
    const updateNewAddress = await User.updateOne(
      { _id: req.session.user_id },
      { $push: { address: newaddress } }
    );

    if (updateNewAddress) {
      return res.redirect("/manageaddress");
    }
  } catch (error) {
    console.log(error.message);
  }
};

const editAddress = async (req, res) => {
  try {
    const {
      addressIndex,
      editName,
      editMobile,
      editPincode,
      editLocality,
      editAddress,
      editCity,
      editState,
      editLandmark,
      editAltmobile,
      editAddresstype,
    } = req.body;

    const updateData = {
      name: editName,
      mobile: editMobile,
      pincode: editPincode,
      locality: editLocality,
      address: editAddress,
      city: editCity,
      state: editState,
      landmark: editLandmark,
      altmobile: editAltmobile,
      addresstype: editAddresstype,
    };

    const editStatus = await User.updateOne(
      { _id: req.session.user_id },
      { $set: { [`address.${addressIndex}`]: updateData } }
    );

    if (editStatus) {
      res.redirect("/manageaddress");
    }
    console.log(editStatus);
  } catch (error) {}
};

const addressDelete = async (req, res) => {
  try {
    const addressIndex = req.params.id;

    console.log(addressIndex);

    const user = await User.findById(req.session.user_id);

    if (addressIndex < 0 || addressIndex >= user.address.length) {
      return res.status(HttpStatus.BAD_REQUEST).send({ error: USER_MESSAGES.INVALID_ADDRESS_INDEX });
    }

    user.address.splice(addressIndex, 1);
    const deleteStatus = await user.save();

    if (deleteStatus) {
      return res.redirect("/manageaddress");
    } else {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ error: USER_MESSAGES.DELETE_ADDRESS_FAILED });
    }
  } catch (error) {
    console.error(error);
    return res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: USER_MESSAGES.DELETE_ADDRESS_ERROR });
  }
};

const addTocart = async (req, res) => {
  try {
    const { productId, quantity } = req.query;
    
   

    if (!req.session.user_id) {
      return res.redirect("/login");
    }

  
    const product = {
      productId: new mongoose.Types.ObjectId(productId),
      quantity: parseInt(quantity),
    };

    console.log(product);

    let cart = await Cart.findOne({ user_id: new mongoose.Types.ObjectId(req.session.user_id) });

    let totalPrice = 0;
    let existingProduct = null;

    if (cart) {
      for (const item of cart.Product) {
        const singleProduct = await Product.findById(item.productId);
        if (!singleProduct) {
          throw new Error(`Product with ID ${item.productId} not found`);
        }
        console.log(`Found product: ${singleProduct.name}, Price: ${singleProduct.price}`);
        const productPrice = item.quantity * singleProduct.price;
        totalPrice += productPrice;

        if (item.productId.equals(product.productId)) {
          existingProduct = item;
        }
      }
    } else {
      cart = new Cart({
        user_id: new mongoose.Types.ObjectId(req.session.user_id),
        Product: [],
      });
    }

    const singleProduct = await Product.findById(product.productId);
    if (!singleProduct) {
      throw new Error(`Product with ID ${product.productId} not found`);
    }

    if (existingProduct) {
      totalPrice -= existingProduct.quantity * singleProduct.price;
      existingProduct.quantity = product.quantity;
      totalPrice += existingProduct.quantity * singleProduct.price;
    } else {
      const newProductPrice = product.quantity * singleProduct.price;
      totalPrice += newProductPrice;

      cart.Product.push(product);
    }

    const discount = 0; 
    const finalPrice = totalPrice - discount;

    cart.totalPrice = totalPrice;
    cart.discount = discount;
    cart.finalPrice = finalPrice;

    await cart.save();

    return res.status(HttpStatus.OK)
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(ERROR_MESSAGES.AN_ERROR_OCCURRED);
  }
};

const cart = async (req, res) => {
  try {
    console.log(req.session.user_id);

    const result = await Cart.aggregate([
      {
        $match: { user_id: new mongoose.Types.ObjectId(req.session.user_id) },
      },
      {
        $unwind: "$Product",
      },
      {
        $lookup: {
          from: "products",
          localField: "Product.productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      {
        $unwind: "$productDetails",
      },
      {
        $addFields: {
          totalPrice: {
            $multiply: ["$Product.quantity", "$productDetails.price"],
          },
        },
      },
      {
        $group: {
          _id: null,
          items: {
            $push: {
              productId: "$Product.productId",
              quantity: "$Product.quantity",
              productDetails: {
                product_name: "$productDetails.product_name",
                product_description: "$productDetails.product_description",
                price: "$productDetails.price",
                in_stock: "$productDetails.in_stock",
                product_img: "$productDetails.product_img",
              },
              totalPrice: "$totalPrice",
            },
          },
          totalAmount: { $sum: "$totalPrice" },
        },
      },
      {
        $project: {
          _id: 0,
          items: 1,
          totalAmount: 1,
        },
      },
    ]);

    const user = await User.findById(req.session.user_id);

    if (result.length > 0) {
      res.render("user/cart", {
        cartItems: result[0].items,
        totalAmount: result[0].totalAmount,
        user: sanitizeUser(user),
      });
    } else {
      res.render("user/cart", { cartItems: [], totalAmount: 0, user: typeof user !== "undefined" ? sanitizeUser(user) : null });
    }
  } catch (error) {
    console.log(error.message);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(PAYMENT_MESSAGES.CART_FETCH_ERROR);
  }
};

const quantityUpdate = async (req, res) => {
  try {
    const { product_id, currentQuantity } = req.body;
    console.log(product_id, currentQuantity);

    let updateQuery;
    if (currentQuantity === "inc") {
      updateQuery = { $inc: { "Product.$.quantity": 1 } };
    } else if (currentQuantity === "dec") {
      updateQuery = { $inc: { "Product.$.quantity": -1 } };
    } else {
      return res.status(HttpStatus.BAD_REQUEST).send(PAYMENT_MESSAGES.INVALID_QUANTITY_UPDATE);
    }

    const updateResult = await Cart.updateOne(
      {
        user_id: req.session.user_id,
        "Product.productId": product_id,
      },
      updateQuery
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(HttpStatus.NOT_FOUND).send(PAYMENT_MESSAGES.PRODUCT_NOT_IN_CART);
    }


    const cart = await Cart.findOne({ user_id: req.session.user_id }).populate('Product.productId');

    if (!cart) {
      return res.status(HttpStatus.NOT_FOUND).send(PAYMENT_MESSAGES.CART_NOT_FOUND);
    }


    let totalPrice = 0;
    for (const item of cart.Product) {
      const product = await Product.findById(item.productId);
      if (!product) {
        throw new Error(`Product with ID ${item.productId} not found`);
      }
      totalPrice += item.quantity * product.price;
    }

    const discount = cart.discount || 0; 

    const finalPrice = totalPrice - discount;


    cart.totalPrice = totalPrice;
    cart.finalPrice = finalPrice;

    await cart.save();

    return res.status(HttpStatus.OK).send(PAYMENT_MESSAGES.QUANTITY_UPDATED);
  } catch (error) {
    console.error("Error updating product quantity:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(ERROR_MESSAGES.AN_ERROR_OCCURRED);
  }
};



const removeItem = async (req, res) => {
  try {
    const removeId = req.params.id;
    console.log(removeId);

    console.log("this is removing route");
    const removeStat = await Cart.updateOne(
      { user_id: req.session.user_id },
      { $pull: { Product: { productId: removeId } } }
    );

    console.log(removeStat);

    if (removeStat.nModified > 0) {
      // res.redirect('/cart');
    } else {
      res.json({ message: "No changes made" });
    }
  } catch (error) {
    console.log(error.message);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: ERROR_MESSAGES.SERVER_ERROR });
  }
};

const checkOut = async (req, res) => {
  try {
      
    const wallet1 = await Wallet.findOne({ user_id: new object_id(req.session.user_id) });
 
    
    
    const user = await User.findOne({ _id: req.session.user_id });

    const result = await Cart.aggregate([
      {
        $match: { user_id: new mongoose.Types.ObjectId(req.session.user_id) },
      },
      {
        $unwind: "$Product",
      },
      {
        $lookup: {
          from: "products",
          localField: "Product.productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      {
        $unwind: "$productDetails",
      },
      {
        $addFields: {
          totalPrice: {
            $multiply: ["$Product.quantity", "$productDetails.price"],
          },
        },
      },
      {
        $lookup: {
          from: "coupons", 

          localField: "couponDetails._id",
          foreignField: "_id",
          as: "couponDetails"
        },
      },
      {
        $unwind: {
          path: "$couponDetails",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: null,
          items: {
            $push: {
              productId: "$Product.productId",
              quantity: "$Product.quantity",
              productDetails: {
                product_name: "$productDetails.product_name",
                product_description: "$productDetails.product_description",
                price: "$productDetails.price",
                in_stock: "$productDetails.in_stock",
                product_img: "$productDetails.product_img",
              },
              totalPrice: "$totalPrice",
            },
          },
          totalAmount: { $sum: "$totalPrice" },
          discount: { $first: "$discount" },
          finalPrice: { $first: "$finalPrice" },
          couponDetails: { $first: "$coupon" },
        },
      },
      {
        $project: {
          _id: 0,
          items: 1,
          totalAmount: 1,
          discount: 1,
          finalPrice: 1,
          coupon: 1,
        },
      },
    ]);

    if (result.length > 0) {

      const cart = await Cart.findOne({ user_id: req.session.user_id });
    
      if (!cart) {
          throw new Error('Cart not found');
      }
  
      const coupon = await Coupons.findOne({ Coupon_Code: cart.coupon });
      const allCoupons = await Coupons.find({ is_active: true });
      
 
  



      
       


      

      console.log(result[0]);
      res.render("user/checkout", {
        cartItems: result[0].items,
        totalAmount: result[0].totalAmount,
        discount: result[0].discount,
        finalPrice: result[0].finalPrice,
        couponDetails: result[0].couponDetails,

        user: sanitizeUser(user),
         key: RAZORPAY_ID_KEY ,
         coupon,
         allCoupons,
         wallet:wallet1
      });
    } else {
      res.render("user/checkout", { cartItems: [], totalAmount: 0, discount: 0, couponDetails: {}, user: typeof user !== "undefined" ? sanitizeUser(user) : null, allCoupons: [] });
    }
  } catch (error) {
    console.error('Error during checkout:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(PAYMENT_MESSAGES.CHECKOUT_ERROR);
  }
};



// const conformOrder = async (req, res) => {
//   try {
//     console.log('Processing order...');

//     const { totalAmount, orderAddress, productIds, PaymentMethod } = req.body;
//     const currentDate = new Date();
//     const formattedDate = currentDate.toISOString().split('T')[0];
//     console.log('Order Date:', formattedDate);

//     if (!req.session.user_id) {
//       return res.status(401).json({ success: false, message: 'User not authenticated' });
//     }

//     // Find user data
//     const userData = await User.findOne({ _id: req.session.user_id });
//     if (!userData) {
//       return res.status(404).json({ success: false, message: 'User not found' });
//     }

//     const cartProduct = await Cart.findOne({ user_id: req.session.user_id });

//     console.log(`Cart Product: ${cartProduct.Product}`);

//     // Create a new order
//     const orderStatus = new Order({
//       user_id:req.session.user_id,
//       name: userData.name,
//       email: userData.email,
//       status: 'success',
//       shipment_address: orderAddress,
//       product: cartProduct.Product,
//       orderDate: formattedDate,
//       paymentMethod: PaymentMethod
//     });

//     const signupDataSuccess = await orderStatus.save();

// for (const cartItem of cartProduct.Product) {
//   const product = await Product.findOne({ _id: cartItem.productId });
//   if (product) {
//     product.in_stock -= cartItem.quantity;
//     await product.save();
//   } else {
//     console.log(`Product not found: ${cartItem.productId}`);
//   }
// }

//     const cartDelete=await Cart.deleteOne({user_id:req.session.user_id});

//     if (signupDataSuccess) {
//       console.log('Order saved successfully');
//       return res.status(200).json({ success: true, message: 'Order confirmed' });
//     }

//     // If the save fails
//     return res.status(500).json({ success: false, message: 'Order confirmation failed' });

//   } catch (error) {
//     console.error('Error processing order:', error);
//     return res.status(500).json({ success: false, message: 'Server error' });
//   }
// };

const orderSuccess = async (req, res) => {
  try {
    res.render("user/orderComplete");
  } catch (error) {
    console.error("Error rendering order success page:", error.message);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(ERROR_MESSAGES.SERVER_ERROR);
  }
};

// const myOrders = async (req, res) => {
//   try {
//       const orders = await Order.find({ user_id: req.session.user_id });
//       console.log('myOrders');
//       res.render('user/myOrders', { myOrders: orders });
//   } catch (error) {
//       console.error(error);
//       res.status(500).send('Server Error');
//   }
// }


const getOrderHistory = async (req, res) => {
  try {
    const userId = req.session.user_id;

    if (!userId) {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .render("error", { message: USER_MESSAGES.UNAUTHORIZED });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(HttpStatus.NOT_FOUND).render("error", { message: USER_MESSAGES.NOT_FOUND });
    }

    const orders = await Order.aggregate([
      { $match: { email: user.email } },
      {
        $lookup: {
          from: "products",
          localField: "product.productId",
          foreignField: "_id",
          as: "newone",
        },
      },

      { $sort: { orderDate: -1 } },
    ]);

    const orderPayment = await Order.find({ email: user.email }).sort({ orderDate: -1 });

    if (orders.length === 0) {
      console.log("No orders found for user:", userId);
    }

    let toast = req.flash("info");
    res.render("user/myOrders", { orders, toast, orderPayment, user: typeof user !== "undefined" ? sanitizeUser(user) : null });
  } catch (error) {
    console.error("Error in getOrderHistory:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).render("error", {
      message: PAYMENT_MESSAGES.ORDER_HISTORY_ERROR,
    });
  }
};

const myOrderDetails = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const { id, productId } = req.query;

    if (!userId) {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .render("error", { message: USER_MESSAGES.UNAUTHORIZED });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(HttpStatus.NOT_FOUND).render("error", { message: USER_MESSAGES.NOT_FOUND });
    }

    if (!id || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(HttpStatus.BAD_REQUEST).render("error", { message: "Invalid request parameters" });
    }

    const orderData = await Order.aggregate([
      { $match: { orderNumber: id } },
      {
        $lookup: {
          from: "products",
          localField: "product.productId",
          foreignField: "_id",
          as: "newone",
        },
      },
    ]);

    if (!orderData || orderData.length === 0) {
      return res.status(HttpStatus.NOT_FOUND).render("error", { message: "Order not found" });
    }

    const order = orderData[0];

    const productIndex = order.product.findIndex(
      (p) => p._id.toString() === productId
    );

    if (productIndex === -1) {
      return res.status(HttpStatus.NOT_FOUND).render("error", { message: "Product not found in this order" });
    }

    const productItem = order.product[productIndex];
    const productInfo = order.newone[productIndex];

    const existingReview = await Review.findOne({
      orderId: order._id,
      productId: productInfo._id,
      userId: req.session.user_id
    });

    res.render("user/myOrderDetails", {
      order,
      productItem,
      productInfo,
      existingReview,
      user: typeof user !== "undefined" ? sanitizeUser(user) : null
    });
  } catch (error) {
    console.error("Error in myOrderDetails:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).render("error", {
      message: "An error occurred while fetching order details",
    });
  }
};

  


const path = require('path');
const invoiceDownload = async (req, res) => {
  try {
    const { objectId, productId } = req.params;
    
    const order = await Order.findOne({ orderNumber: objectId });

    const productIndex = order.product.findIndex(
      (p) => p._id.toString() === productId
    );

    if (productIndex === -1) {
      return res.status(HttpStatus.NOT_FOUND).send(PRODUCT_MESSAGES.NOT_FOUND_IN_ORDER);
    }

    const Orderproduct = order.product[productIndex];

    const productFullDetails = await Order.aggregate([
      { $match: { _id: order._id } },
      { $unwind: '$product' },
      { $match: { 'product._id': Orderproduct._id } },
      {
        $lookup: {
          from: 'products',
          localField: 'product.productId',
          foreignField: '_id',
          as: 'productFullDetails'
        }
      },
      { $unwind: '$productFullDetails' },
      {
        $project: {
          orderNumber: 1,
          product: 1,
          productFullDetails: 1
        }
      }
    ]);

    const product = productFullDetails[0].productFullDetails;

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-disposition', 'attachment; filename=invoice.pdf');
    res.setHeader('Content-type', 'application/pdf');
    doc.pipe(res);

    doc.fontSize(20).text('INVOICE', { align: 'center' });
    doc.moveDown();

    // Company Information
    doc.fontSize(12).text('WIZCART', 50, 100)
      .text('Street Address', 50, 115)
      .text('Wayanad, Kerala, 673596', 50, 130)
      .text('Phone: 8590876697', 50, 145)
      .text('Email: wizcartsupport@gmail.com', 50, 160);

    // Customer Information
    doc.fontSize(12)
      .text('Bill To:', 350, 100)
      .text(order.shipment_address.name, 350, 130)
      .text(order.shipment_address.address, 350, 145)
      .text(`${order.shipment_address.city}, ${order.shipment_address.pincode}`, 350, 160)
      .text(`Phone: ${order.shipment_address.mobile}`, 350, 175)
      .moveDown();

    // Invoice Details
    doc.moveTo(50, 200)
      .lineTo(550, 200)
      .stroke();

    doc.fontSize(12)
      .text(`Invoice Date: ${new Date().toLocaleDateString()}`, 50, 225)
      .text(`Order Number: ${order.orderNumber || 'N/A'}`, 50, 240)
      .text(`OrderID: ${objectId}`, 50, 255)
      .moveDown();

    // Line Items Header
    const itemsHeaderY = 280;
    doc.moveTo(50, itemsHeaderY - 15)
      .lineTo(550, itemsHeaderY - 15)
      .stroke();

    doc.fontSize(12).text('Product Image', 50, itemsHeaderY)
      .text('Description', 150, itemsHeaderY)
      .text('Quantity', 350, itemsHeaderY, { width: 50, align: 'right' }) 
      .text('Price', 400, itemsHeaderY, { width: 70, align: 'right' }) 
      .text('Total', 470, itemsHeaderY, { width: 80, align: 'right' }); 

    doc.moveTo(50, itemsHeaderY + 15)
      .lineTo(550, itemsHeaderY + 15)
      .stroke();

    const imageWidth = 80;
    const imageHeight = 100;
    const itemSpacing = 120; 

    const items = [
      {
        description: product.product_name,
        quantity: Orderproduct.quantity,
        price: product.price,
        image: product.product_img[0],
      },
    ];

    let itemY = itemsHeaderY + 30;
    for (const item of items) {
      if (item.image) {
        try {
          const imagePath = path.join(__dirname, '..', 'public', item.image);

          if (fs.existsSync(imagePath)) {
            const imgBuffer = fs.readFileSync(imagePath);
            doc.image(imgBuffer, 50, itemY, { width: imageWidth, height: imageHeight });
          } else {
            console.error('Image not found:', imagePath);
            doc.text('Image not available', 50, itemY);
          }
        } catch (imageError) {
          console.error('Error loading image:', imageError);
          doc.text('Image not available', 50, itemY);
        }
      }

      doc.fontSize(12).text(item.description, 150, itemY)
        .text(item.quantity, 350, itemY, { width: 50, align: 'right' }) 
        .text(item.price.toFixed(2), 400, itemY, { width: 70, align: 'right' }) 
        .text((item.quantity * item.price).toFixed(2), 470, itemY, { width: 80, align: 'right' }); 

      itemY += itemSpacing; 
    }

  
    const subtotal = items.reduce((acc, item) => acc + item.quantity * item.price, 0);
    const tax = subtotal * 0.1;
    const total = subtotal + tax;

    doc.moveTo(50, itemY + 15)
      .lineTo(550, itemY + 15)
      .stroke();

    doc.fontSize(12).text('total', 50, itemY + 30)
      .text(subtotal.toFixed(2), 0, itemY + 30, { align: 'right' });

 


    doc.moveTo(50, itemY + 100)
      .lineTo(550, itemY + 100)
      .stroke();

    doc.fontSize(10).text('Thank you for your business!', 50, itemY + 110, { align: 'center', width: 500 })
      .text('Please make the payment by the due date.', 50, itemY + 125, { align: 'center', width: 500 });

    doc.end();

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(ERROR_MESSAGES.PDF_ERROR);
  }
};




















const cancellProductStatus = async (req, res) => {
  try {

    const { object_id, product_id, product_name } = req.body;
    let product_price;

    // Find the order by its ID
    const order = await Order.findOne({ orderNumber: object_id });

    if (!order) {
      return res.status(HttpStatus.NOT_FOUND).json({ status: 'error', message: PAYMENT_MESSAGES.ORDER_NOT_FOUND });
    }

    const productIndex = order.product.findIndex(
      (p) => p._id.toString() === product_id
    );

    if (productIndex === -1) {
      return res.status(HttpStatus.NOT_FOUND).json({ status: 'error', message: PRODUCT_MESSAGES.NOT_FOUND_IN_ORDER });
    }

    const quantity = order.product[productIndex].quantity;
    product_price = order.product[productIndex].productPrice;
    order.product[productIndex].status = "cancelled";

    if (order.paymentMethod === 'COD') {
      order.product[productIndex].refund = "no refund";
    } else {
      order.product[productIndex].refund = "completed";
    }

    const product = await Product.findOne({
      _id: order.product[productIndex].productId,
    });

    if (!product) {
      return res.status(HttpStatus.NOT_FOUND).json({ status: 'error', message: PRODUCT_MESSAGES.NOT_FOUND });
    }

    product.in_stock += quantity;

    await order.save();
    await product.save();

    if (order.paymentMethod === 'COD') {
      return res.redirect('/getOrderHistory');
    } else {

      const walletIsexist = await Wallet.findOne({ user_id: new mongoose.Types.ObjectId(req.session.user_id) });

      if (!walletIsexist) {
        const addToWallet = new Wallet({
          user_id: new mongoose.Types.ObjectId(req.session.user_id),
          balance: product_price,
          transactions: [{
            amount: product_price,
            type: order.paymentMethod,
            description: product_name + ' amount credited'
          }]
        });

        const status = await addToWallet.save();
        if (status) {
          return res.redirect('/getOrderHistory');
        }
      } else {

        const updatedBalance = walletIsexist.balance + product_price;
        const walletUpdate = await Wallet.updateOne(
          { user_id: new mongoose.Types.ObjectId(req.session.user_id) },
          {
            $set: { balance: updatedBalance },
            $push: {
              transactions: {
                amount: product_price,
                type: order.paymentMethod,
                description: product_name + ' amount credited'
              }
            }
          }
        );

        if (walletUpdate.modifiedCount > 0) {
          return res.redirect('/getOrderHistory');
        } else {
          return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ status: 'error', message: USER_MESSAGES.WALLET_UPDATE_FAILED });
        }
      }
    }
  } catch (error) {
    console.error("Error updating product status:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ status: 'error', message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};





const orderReturn = async (req, res) => {
  try {
    
    const { object_id, product_id, product_price, product_name } = req.body;

    console.log(object_id, product_id, product_price, product_name);

   


    const order = await Order.findOne({ orderNumber: object_id });

    if (!order) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: PAYMENT_MESSAGES.ORDER_NOT_FOUND });
    }

    const productIndex = order.product.findIndex(
      (p) => p._id.toString() === product_id
    );

    if (productIndex === -1) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: PRODUCT_MESSAGES.NOT_FOUND_IN_ORDER });
    }

    const quantity = order.product[productIndex].quantity;

    order.product[productIndex].status = "return pending";

   


    const status= await order.save();





     
      if (status) {
        req.flash("info", "Order returned and wallet credited successfully");
        return res.redirect('/getOrderHistory');
      }
  

     

  } catch (error) {
    console.error("Error updating product status:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};
 










const Coupon = async (req, res) => {
  try {
    const couponCode = req.body.coupon;

    const couponIsexist = await Coupons.findOne({ Coupon_Code: couponCode });
    console.log(couponIsexist);

    if (couponIsexist) {
      if (couponIsexist.is_active == false) {
        return res
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json({ message: COUPON_MESSAGES.UNAVAILABLE });
      }

      const currentDate = new Date();
      const expiryDate = new Date(couponIsexist.expiry_Date);

      if (expiryDate < currentDate) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: COUPON_MESSAGES.EXPIRED });
      }

      const cart = await Cart.findOne({ user_id: req.session.user_id });
      if (!cart) {
        return res.status(HttpStatus.NOT_FOUND).json({ message: PAYMENT_MESSAGES.CART_NOT_FOUND });
      }

      if (couponIsexist.discount_Price >= cart.totalPrice) {
        return res.status(HttpStatus.BAD_REQUEST).json({ message: COUPON_MESSAGES.DISCOUNT_EXCEEDS_CART });
      }

      const applyCoupon = await Cart.findOneAndUpdate(
        { user_id: req.session.user_id },  
        { 
          $set: { 
            coupon: couponIsexist.Coupon_Code, 
            discount: couponIsexist.discount_Price 
          } 
        },
        { new: true } 
      );
            
      res.status(HttpStatus.OK).json({ Coupon: couponIsexist });
        

    } else {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: COUPON_MESSAGES.NOT_FOUND });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: COUPON_MESSAGES.APPLY_ERROR });
  }
}



const applyCoupon = async (req, res) => {
  try {

    
      const coupon = req.body.couponCode;

  console.log(coupon.Coupon_Code);
  
  

      const cart = await Cart.findOne({ user_id: new mongoose.Types.ObjectId(req.session.user_id) });

    console.log(cart);
    
      if (!cart) {
          return res.status(HttpStatus.NOT_FOUND).json({ message: PAYMENT_MESSAGES.CART_NOT_FOUND });
      }

      const discountPrice = coupon.discount_Price;

      if (discountPrice >= cart.totalPrice) {
          return res.status(HttpStatus.BAD_REQUEST).json({ message: COUPON_MESSAGES.DISCOUNT_EXCEEDS_CART });
      }

      const finalPrice = cart.finalPrice;
      const final = finalPrice - discountPrice;
      console.log(finalPrice);

      const update = await Cart.updateOne(
          { user_id: new mongoose.Types.ObjectId(req.session.user_id) },
          { $set: { discount: discountPrice, finalPrice: final ,coupon:coupon.Coupon_Code} }
      );
      console.log(update);
      

      if (update.nModified === 0) {
          return res.status(HttpStatus.BAD_REQUEST).json({ message: PAYMENT_MESSAGES.CART_UPDATE_FAILED });
      }

      res.status(HttpStatus.OK).json({ success: true });

  } catch (error) {
      console.error('Error applying coupon:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: COUPON_MESSAGES.APPLY_ERROR });
  }
};




const removeCoupon = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user_id: new mongoose.Types.ObjectId(req.session.user_id) });

    if (!cart) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: PAYMENT_MESSAGES.CART_NOT_FOUND });
    }

    const updatedCart = await Cart.updateOne(
      { user_id: new mongoose.Types.ObjectId(req.session.user_id) },
      {
        $set: {
          discount: 0,
          coupon: '',
          finalPrice: cart.totalPrice 
        }
      }
    );

    if (updatedCart) {
      res.status(HttpStatus.OK).json({ message: COUPON_MESSAGES.REMOVED });
    } else {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: COUPON_MESSAGES.REMOVE_FAILED });
    }
  } catch (error) {
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: ERROR_MESSAGES.AN_ERROR_OCCURRED, error: error.message });
  }
};


const addToWishlist = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.session.user_id;



        const existingItem = await WishList.findOne({ user_id: userId, productId: productId });

        if (existingItem) {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: USER_MESSAGES.WISHLIST_ALREADY_EXISTS });
        }


        const newWishlistItem = new WishList({
            user_id: userId,
            productId: productId
        });

        await newWishlistItem.save();

        return res.status(HttpStatus.OK).json({ message: USER_MESSAGES.WISHLIST_ADDED });

    } catch (error) {
        console.error(error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: USER_MESSAGES.WISHLIST_ADD_FAILED });
    }
};



const getWishlist = async (req, res) => {
  try {
      const userId = req.session.user_id;

      if (!userId) {
          return res.redirect('/login'); 

      }


      const wishlistItems = await WishList.aggregate([
          {
              $match: { user_id: new mongoose.Types.ObjectId(userId) }
          },
          {
              $lookup: {
                  from: 'products',

                  localField: 'productId',
                  foreignField: '_id',
                  as: 'productDetails'
              }
          },
          {
              $unwind: '$productDetails'
          },
          {
              $project: {
                  _id: 0,
                  in_stock: '$productDetails.in_stock',
                  productId: '$productDetails._id',
                  name: '$productDetails.product_name',
                  description: '$productDetails.product_description',
                  price: '$productDetails.price',
                  images: '$productDetails.product_img'
              }
          }
      ]);


      console.log(wishlistItems[0]);
      const user = await User.findOne({ _id: req.session.user_id });
      const cartQuantity = await getCartQuantity(req.session.user_id);


      res.render("user/wishList", { wishlistItems, user:  sanitizeUser(user),cartQuantity });

  } catch (error) {
      console.error(error.message);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).render('user/wishList', { wishlistItems: [] }); 
  }
};


const getWallet = async (req, res) => {
  try {

      const user = await User.findOne({ _id: req.session.user_id });

      console.log(req.session.user_id,'--------------------')
      const wallet = await Wallet.findOne({ user_id: new object_id(req.session.user_id) });

      if (!wallet) {
        res.render("user/walletNotExist", { user: typeof user !== "undefined" ? sanitizeUser(user) : null }) 

      }
       console.log(user)

      res.render('user/wallet', {
          balance: wallet.balance,
          transactions: wallet.transactions,
          user: sanitizeUser(user)
      });
  } catch (error) {
      console.error(error);
  }
};

const removeWishlist = async (req, res) => {
  try {
      const productId = req.params.id;
      const userId = req.session.user_id;

      console.log('Session data:', req.session); 

      console.log('Removing product from wishlist:', productId);
      console.log('For user:', userId);


      const result = await WishList.findOneAndDelete({
          user_id: new mongoose.Types.ObjectId(userId), 
          productId: new mongoose.Types.ObjectId(productId)
      });

      if (result) {
          res.json({ success: true });
      } else {
          res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: USER_MESSAGES.WISHLIST_NOT_FOUND });
      }
  } catch (error) {
      console.error('Failed to remove item from wishlist:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: USER_MESSAGES.WISHLIST_REMOVE_FAILED });
  }
};




const paymentPending = async (req, res) => {
  try {
    const clearCart = await Cart.deleteOne({ user_id: new mongoose.Types.ObjectId(req.session.user_id)});
    if(clearCart){
      res.render('user/orderPending', { user: typeof user !== "undefined" ? sanitizeUser(user) : null });
    }
  } catch (error) {
    console.log(error);
  }
}

const submitReview = async (req, res) => {
  try {
    const { productId, orderId, userReview } = req.body;
    const userId = req.session.user_id;

    if (!productId || !orderId || !userReview) {
      return res.status(HttpStatus.BAD_REQUEST).send("Missing review details");
    }

    let order;
    if (mongoose.Types.ObjectId.isValid(orderId)) {
      order = await Order.findOne({ _id: orderId, user_id: userId });
    }
    if (!order) {
      order = await Order.findOne({ orderNumber: orderId, user_id: userId });
    }

    if (!order) {
      return res.status(HttpStatus.NOT_FOUND).send("Order not found");
    }

    const productItem = order.product.find(
      (p) => p.productId.toString() === productId || p._id.toString() === productId
    );

    if (!productItem) {
      return res.status(HttpStatus.NOT_FOUND).send("Product not found in this order");
    }

    // Case-insensitive status check
    const statusLower = (productItem.status || "").toLowerCase();
    if (statusLower !== 'delivered' && statusLower !== 'returned') {
      return res.status(HttpStatus.BAD_REQUEST).send("Product not delivered yet");
    }

    const newReview = new Review({
      productId: productItem.productId,
      orderId: order._id, 
      userId,
      userReview
    });

    await newReview.save();

    res.redirect(`/myOrderDetails?id=${order.orderNumber}&productId=${productItem._id}`);
  } catch (error) {
    console.error("Error submitting review:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error submitting review");
  }
};


module.exports = {
  login,
  loginData,
  userBlocked,
  signup,
  signupData,
  otpSending,
  otpData,
  home,
  shopmore,
  logout,
  singleProduct,
  homeLogin,
  profile,
  ProfileNameUpdate,
  ProfileUpdateEmail,
  profileOtpsumbit,
  profilenewPass,
  
  forgotPassword,
  forgotEmail,
  forgetRestpassword,
  loadforgetpassword,
  manageaddress,
  newaddress,
  editAddress,
  addressDelete,
  addTocart,
  cart,
  quantityUpdate,
  removeItem,
  checkOut,
  orderReturn,
  orderSuccess,
  getOrderHistory,
  cancellProductStatus,
  Coupon ,
  applyCoupon,
 removeCoupon,
 addToWishlist,
 getWishlist,
 removeWishlist,
 getWallet,
  // getOrderHistory
  invoiceDownload,
  paymentPending,
  myOrderDetails,
  submitReview,
};
