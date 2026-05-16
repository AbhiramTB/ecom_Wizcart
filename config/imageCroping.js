const multer = require('multer');
const path = require('path');
const fs = require('fs');


// Configure Multer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Ensure uploads directory exists inside public
const uploadsDir = path.join(__dirname, "../", "public", "ImgUploads");
// const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

module.exports={
    upload
}