const mongoose = require('mongoose');
const Cart = require('../model/cartModel');

const getCartQuantity = async (userId) => {
    try {
        if (!userId) return 0;
        
        const cartQuantityResult = await Cart.aggregate([
            {
                $match: {
                    user_id: new mongoose.Types.ObjectId(userId),
                },
            },
            { $unwind: "$Product" },
            { $group: { _id: null, productCount: { $sum: 1 } } },
        ]);

        return cartQuantityResult.length > 0 ? cartQuantityResult[0].productCount : 0;
    } catch (error) {
        console.error("Error fetching cart quantity:", error);
        return 0;
    }
};

module.exports = { getCartQuantity };
