const USER_MESSAGES = {
  CREATED: "User created successfully",
  UPDATED: "User updated successfully",
  DELETED: "User deleted successfully",
  NOT_FOUND: "User not found",
  INVALID_CREDENTIALS: "Invalid credentials",
  UNAUTHORIZED: "User not authenticated",
  ALREADY_EXISTS: "User already exists",
  INVALID_EMAIL_OR_PASSWORD: "Invalid email or password.",
  LOGOUT_ERROR: "An error occurred while logging out.",
  NO_PASSWORD_GOOGLE: "User does not have a password you signUp with google",
  PASSWORD_UPDATED: "Password updated successfully",
  PASSWORD_MISMATCH: "Current password does not match",
  OTP_SEND_FAILED: "Failed to send OTP email",
  EMAIL_NOT_REGISTERED: "Email not registered, please sign up",
  ADDRESS_ADDED: "Address successfully added!",
  INVALID_ADDRESS_INDEX: "Invalid address index",
  DELETE_ADDRESS_FAILED: "Failed to delete address",
  DELETE_ADDRESS_ERROR: "An error occurred while deleting the address",
  WISHLIST_ALREADY_EXISTS: "Product is already in your wishlist",
  WISHLIST_ADDED: "Product added to wishlist successfully",
  WISHLIST_ADD_FAILED: "An error occurred while adding the product to your wishlist",
  WISHLIST_NOT_FOUND: "Product not found in wishlist",
  WISHLIST_REMOVE_FAILED: "Failed to remove item from wishlist",
  WALLET_UPDATE_FAILED: "Failed to update wallet",
};

const PRODUCT_MESSAGES = {
  CREATED: "Product created successfully",
  UPDATED: "Product updated successfully",
  NOT_FOUND: "Product not found",
  UPDATE_FAILED: "Product update failed",
  IMAGE_NOT_FOUND: "Image not found",
  INVALID_PRICE: "Invalid product price",
  NOT_FOUND_IN_ORDER: "Product not found in the order",
};

const CATEGORY_MESSAGES = {
  NOT_FOUND: "Category not found",
};

const COUPON_MESSAGES = {
  CREATED: "Coupon created successfully!",
  DELETED: "Coupon deleted successfully",
  HIDDEN: "Coupon hidden successfully",
  UNHIDDEN: "Coupon unhidden successfully",
  HIDE_ERROR: "An error occurred while hiding the coupon",
  UNHIDE_ERROR: "An error occurred while unhiding the coupon",
  UNAVAILABLE: "the coupon has temporary unavailable",
  EXPIRED: "Coupon has expired",
  NOT_FOUND: "Coupon not found",
  APPLY_ERROR: "An error occurred while applying the coupon",
  REMOVED: "Coupon removed successfully",
  REMOVE_FAILED: "Failed to remove coupon",
  DISCOUNT_EXCEEDS_CART: "Coupon discount price cannot exceed or equal the cart total price",
  DISCOUNT_EXCEEDS_MIN_PURCHASE: "Discount price cannot exceed or equal the minimum purchase amount",
};

const PAYMENT_MESSAGES = {
  SUCCESS: "Payment completed successfully",
  FAILED: "Payment failed",
  ORDER_CREATED: "Order created successfully",
  INSUFFICIENT_BALANCE: "Insufficient balance",
  CART_EMPTY: "Cart is empty",
  VERIFICATION_FAILED: "Payment verification failed",
  VERIFICATION_SUCCESS: "Payment verified successfully",
  VERIFICATION_ERROR: "Error during payment verification",
  INVALID_ORDER_ID: "Invalid order ID",
  ORDER_NOT_FOUND: "Order not found",
  INVALID_ORDER_AMOUNT: "Invalid order amount",
  RAZORPAY_ORDER_FAILED: "Failed to create Razorpay order",
  RETURN_ACCEPTED: "The return request has been accepted and the payment refunded.",
  RETURN_REJECTED: "The return request has been reject.",
  CART_FETCH_ERROR: "An error occurred while fetching cart items",
  INVALID_QUANTITY_UPDATE: "Invalid quantity update operation",
  PRODUCT_NOT_IN_CART: "Product not found in cart",
  CART_NOT_FOUND: "Cart not found",
  QUANTITY_UPDATED: "Product quantity updated successfully",
  CHECKOUT_ERROR: "An error occurred during checkout.",
  ORDER_HISTORY_ERROR: "An error occurred while fetching order history",
  CART_UPDATE_FAILED: "Failed to update cart",
};

const ERROR_MESSAGES = {
  INTERNAL_SERVER_ERROR: "Internal Server Error",
  UNAUTHORIZED: "Unauthorized access",
  FORBIDDEN: "Forbidden",
  SERVER_ERROR: "Server error",
  AN_ERROR_OCCURRED: "An error occurred",
  EXCEL_ERROR: "Error generating Excel",
  PDF_ERROR: "Error generating PDF",
};

module.exports = {
  USER_MESSAGES,
  PRODUCT_MESSAGES,
  CATEGORY_MESSAGES,
  COUPON_MESSAGES,
  PAYMENT_MESSAGES,
  ERROR_MESSAGES
};
