const cloudinary = require('cloudinary').v2;
const env = require('./env');

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET
});



const uploadToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    console.log('[DEBUG Cloudinary] Config check - Cloud Name:', env.CLOUDINARY_CLOUD_NAME ? 'OK' : 'MISSING', '| API Key:', env.CLOUDINARY_API_KEY ? 'OK' : 'MISSING');
    if (!file) {
      console.error('[DEBUG Cloudinary Error] No file provided');
      return reject(new Error('No file provided to uploadToCloudinary'));
    }

    const buffer = Buffer.isBuffer(file) ? file : file.buffer;
    if (!buffer) {
      console.error('[DEBUG Cloudinary Error] Invalid file format / no buffer');
      return reject(new Error('Invalid file format. A buffer is required.'));
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'ecom_Wizcart_products', 
        resource_type: 'image'
      },
      (error, result) => {
        if (error) {
          console.error('[DEBUG Cloudinary Error] Stream upload failed:', error);
          return reject(error);
        }
        if (result && result.secure_url) {
          console.log('[DEBUG Cloudinary] Upload success:', result.secure_url);
          resolve(result.secure_url);
        } else {
          console.error('[DEBUG Cloudinary Error] No secure_url in result:', result);
          reject(new Error('Upload failed: secure_url was not returned by Cloudinary'));
        }
      }
    );

    uploadStream.end(buffer);
  });
};

const deleteFromCloudinary = async (imageUrl) => {
  try {
    if (!imageUrl || typeof imageUrl !== 'string') return;
    const match = imageUrl.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z]+$/);
    if (match && match[1]) {
      const publicId = match[1];
      await cloudinary.uploader.destroy(publicId);
      console.log(`Deleted image from Cloudinary: ${publicId}`);
    }
  } catch (err) {
    console.error('Error deleting image from Cloudinary:', err.message);
  }
};

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary
};
