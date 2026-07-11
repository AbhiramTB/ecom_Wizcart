

const productAddRoute =require('express').Router()
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { log } = require('console');
const Product=require('../model/productModel');
const { uploadToCloudinary } = require('../lib/cloudinary');
const { HttpStatus } = require("../constants/httpStatus");
const { PRODUCT_MESSAGES, ERROR_MESSAGES } = require("../constants/messages");




const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


const uploadsDir = path.join(__dirname, "../", "public", "imgUploads");

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}




productAddRoute.post('/productAdded', upload.any(), async (req, res) => {
   
   try{

    const { productName, productCategory, productPrice, Stock, Brand, ProductDescription } = req.body;

    console.log(productName);
    console.log(productCategory);
    console.log(productPrice);
    console.log(Stock);
    console.log(Brand);
    console.log(ProductDescription);

    const croppedImages = req.files.filter(file => file.fieldname === 'croppedImages');
    let productImages = [];

    for (let i = 0; i < croppedImages.length; i++) {
        const file = croppedImages[i];
        const cloudinaryUrl = await uploadToCloudinary(file);
        productImages.push(cloudinaryUrl);
        console.log(`File uploaded to Cloudinary: ${cloudinaryUrl}`);
    }

    const productDetails = new Product({
        product_name: productName,
        product_description: ProductDescription,
        category_name: productCategory,
        brand: Brand,
        price: productPrice,
        in_stock: Stock,
        product_img: productImages,
        Hide_product: 0,
        Maximum_Retail_Price: productPrice,
        offer_price: 0
    });

    
        const signupDataSuccess = await productDetails.save();
        if (signupDataSuccess) {
            req.flash('info', '✅ New Product Added');
            res.redirect('/Products');
        }

    } catch (error) {
        console.error('Error saving product details:', error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
});







productAddRoute.post('/loadEditProduct', upload.any(), async (req, res) => {
    try {
        const croppedImages = req.files.filter(file => file.fieldname === 'croppedImages');
        let productImages = [];

        for (let i = 0; i < croppedImages.length; i++) {
            const file = croppedImages[i];
            const cloudinaryUrl = await uploadToCloudinary(file);
            productImages.push(cloudinaryUrl);
            console.log(`File uploaded to Cloudinary: ${cloudinaryUrl}`);
        }

        const {
            productId,
            editProductName,
            editProductCategory,
            editProductPrice,
            editStock,
            editBrand,
            editProductDescription,
        } = req.body;


          
        const productData = await Product.findById({_id:productId})

        const updateImg =[...productData.product_img,...productImages]

           console.log(updateImg);

        const updateResult = await Product.updateOne(
            { _id: productId },
            {
                $set: {
                    product_name: editProductName,
                    product_description: editProductDescription,
                    category_name: editProductCategory,
                    brand: editBrand,
                    price: editProductPrice,
                    in_stock: editStock,
                    product_img: updateImg,
                    Hide_product: 0,
                    Maximum_Retail_Price: editProductPrice,
                    offer_price: 0
                },
            }
        );

        if (updateResult.modifiedCount === 0) {
            return res.status(HttpStatus.NOT_FOUND).send(PRODUCT_MESSAGES.UPDATE_FAILED);
        }
        req.flash('info', 'PRODUCT WAS SUCCESSFULLY EDITED ');
        res.redirect('/Products');
    } catch (error) {
        console.error(error.message);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(ERROR_MESSAGES.AN_ERROR_OCCURRED);
    }
});




module.exports = {
    productAddRoute
};
