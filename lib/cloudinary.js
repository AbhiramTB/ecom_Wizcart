const cloudinary = require('cloudinary').v2;
const env = require('./env');

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET
});



const uploadToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('No file provided to uploadToCloudinary'));
    }

    const buffer = Buffer.isBuffer(file) ? file : file.buffer;
    if (!buffer) {
      return reject(new Error('Invalid file format. A buffer is required.'));
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'ecom_Wizcart_products', 
        resource_type: 'image'
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        if (result && result.secure_url) {
          resolve(result.secure_url);
        } else {
          reject(new Error('Upload failed: secure_url was not returned by Cloudinary'));
        }
      }
    );

    uploadStream.end(buffer);
  });
};

module.exports = {
  uploadToCloudinary
};
