const mongoose = require("mongoose");

const brandSchema = new mongoose.Schema(
  {
    brand_name: {
      type: String,
      required: true,
      trim: true,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index for fast case-insensitive duplicate checks
brandSchema.index({ brand_name: 1 });

module.exports = mongoose.model("brand", brandSchema);
