const mongoose = require("mongoose");

const categoryOfferSchema = new mongoose.Schema({
  category_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "category",
    required: true,
    unique: true
  },
  discount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model("categoryOffer", categoryOfferSchema);
