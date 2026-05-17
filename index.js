const express = require("express");
const app = express();
const userRoute = require("./router/userRouter");
const adminRoute = require("./router/adminRouter");
const path = require("path");
var morgan = require('morgan')

const session = require("express-session");
const mongoose = require("mongoose");
const passport = require("passport");
const nocache = require("nocache");
const flash = require("connect-flash");
const cookieParser = require("cookie-parser");
const productAddRoute = require("./controller/productAdding");
const methodOverride = require("method-override");
const cors = require('cors');

const env = require("./lib/env");

mongoose.connect(env.MONGODB_CONNECT);


app.use(productAddRoute.productAddRoute);
app.use(nocache());
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(methodOverride("_method"));
const googleAuth = require("./auth/google");
const e = require("express");

app.use(cookieParser(env.COOKIE_SECRET));
app.use(flash());
app.use(cors({
  origin:env.CORS_ORIGIN,
  credentials:true
}));


app.use(
  session({
    secret: env.SESSION_SECRET,
    resave: true,
    saveUninitialized: false,
  })
);



app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname,"public")));

app.use(userRoute.userRoute);
app.use(adminRoute.adminRoute);
app.listen(env.PORT, () => console.log(`http://localhost:${env.PORT}`));

app.use(googleAuth.authRoute);
