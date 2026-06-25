const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
    product_name: {
    type: String,
  },
  product_description: {
    type: String,
  },                                            
  category_name:{                                
    type: mongoose.Schema.Types.ObjectId,
    ref: "category"
  },             
  brands: {
    type: String,
  },
  price: {
    type: Number,
  },
  in_stock: {
    type: Number,
    
  },
   product_img: {
    type:Array,
  },
  Hide_product: {
    type:Number,
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  Maximum_Retail_Price:{
   type:Number,
  }
});

module.exports = mongoose.model("product",ProductSchema);
