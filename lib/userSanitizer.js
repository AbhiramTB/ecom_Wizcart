const sanitizeUser = (user) => {
    if (!user) return null;
    
    const userObj = typeof user.toObject === 'function' ? user.toObject() : { ...user };
    
    delete userObj.password;
    delete userObj.is_admin;
    delete userObj.is_ban;
    delete userObj.googleId;
    
    return userObj;
};

module.exports = { sanitizeUser };
