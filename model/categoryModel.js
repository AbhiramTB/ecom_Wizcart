const mongoose = require("mongoose");

const category = new mongoose.Schema({
    category_name: {
    type: String,
  },
  Hide_category: {
    required: true,
    type:Number,
  }

}, { timestamps: true });

module.exports = mongoose.model("category",category);
