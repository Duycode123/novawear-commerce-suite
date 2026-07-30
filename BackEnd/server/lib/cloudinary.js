const { v2: cloudinary } = require("cloudinary");

function createCloudinaryService() {
  const enabled = String(process.env.CLOUDINARY_ENABLED || "false").toLowerCase() === "true";
  const cloudinaryUrl = String(process.env.CLOUDINARY_URL || "").trim();
  const cloudName = String(process.env.CLOUDINARY_CLOUD_NAME || "").trim();
  const apiKey = String(process.env.CLOUDINARY_API_KEY || "").trim();
  const apiSecret = String(process.env.CLOUDINARY_API_SECRET || "").trim();
  const configured = enabled && Boolean(cloudinaryUrl || (cloudName && apiKey && apiSecret));

  if (configured) {
    if (cloudinaryUrl) cloudinary.config(cloudinaryUrl);
    else cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
  }

  function assertConfigured() {
    if (!configured) {
      const error = new Error("Cloudinary chưa được bật hoặc thiếu thông tin kết nối.");
      error.code = "CLOUDINARY_NOT_CONFIGURED";
      throw error;
    }
  }

  async function uploadBuffer(buffer, resourceType, folder) {
    assertConfigured();
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({
        folder,
        resource_type: resourceType,
        overwrite: false,
        unique_filename: true,
        use_filename: false,
        transformation: resourceType === "image"
          ? [{ quality: "auto", fetch_format: "auto" }]
          : undefined,
      }, (error, result) => {
        if (error) reject(error);
        else resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          bytes: result.bytes,
          format: result.format,
        });
      });
      stream.end(buffer);
    });
  }

  return {
    enabled,
    configured,
    uploadImage(buffer, folder) {
      return uploadBuffer(buffer, "image", folder);
    },
  };
}

module.exports = { createCloudinaryService };
