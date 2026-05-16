require("dotenv").config();

const env = {
    PORT: process.env.PORT || 3100,
    MONGODB_CONNECT: process.env.MONGODB_CONNECT,

    COOKIE_SECRET: process.env.COOKIE_SECRET,
    SESSION_SECRET: process.env.SESSION_SECRET,

    RAZORPAY_ID_KEY: process.env.RAZORPAY_ID_KEY,
    RAZORPAY_SECRET_KEY: process.env.RAZORPAY_SECRET_KEY,

    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,

    CLIENT_ID: process.env.CLIENT_ID,
    CLIENT_SECRET: process.env.CLIENT_SECRET,

    EMAIL_SERVICE_EMAIL: process.env.EMAIL_SERVICE_EMAIL,
    EMAIL_SERVICE_PASSWORD: process.env.EMAIL_SERVICE_PASSWORD,
};

module.exports = env;
