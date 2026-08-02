const assert = require("node:assert/strict");
const test = require("node:test");
const { v2: cloudinary } = require("cloudinary");
const { createCloudinaryService } = require("../lib/cloudinary");

test("Cloudinary preserves the uploaded master instead of applying a lossy incoming transformation", async (context) => {
  const previousEnvironment = {
    CLOUDINARY_ENABLED: process.env.CLOUDINARY_ENABLED,
    CLOUDINARY_URL: process.env.CLOUDINARY_URL,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  };
  const previousConfig = { ...cloudinary.config() };
  const previousUploadStream = cloudinary.uploader.upload_stream;
  const previousDestroy = cloudinary.uploader.destroy;
  let uploadOptions;
  let deletedPublicId;

  process.env.CLOUDINARY_ENABLED = "true";
  delete process.env.CLOUDINARY_URL;
  process.env.CLOUDINARY_CLOUD_NAME = "novawear-test";
  process.env.CLOUDINARY_API_KEY = "test-key";
  process.env.CLOUDINARY_API_SECRET = "test-secret";

  cloudinary.uploader.upload_stream = (options, callback) => {
    uploadOptions = options;
    return {
      end() {
        callback(null, {
          secure_url: "https://res.cloudinary.com/novawear-test/image/upload/v1/products/photo.jpg",
          public_id: "products/photo",
          width: 1800,
          height: 2400,
          bytes: 500000,
          format: "jpg",
          version: 1,
        });
      },
    };
  };
  cloudinary.uploader.destroy = async (publicId) => {
    deletedPublicId = publicId;
  };

  context.after(() => {
    Object.entries(previousEnvironment).forEach(([key, value]) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
    cloudinary.config(previousConfig);
    cloudinary.uploader.upload_stream = previousUploadStream;
    cloudinary.uploader.destroy = previousDestroy;
  });

  const service = createCloudinaryService();
  const uploaded = await service.uploadImage(Buffer.from("image"), "novawear/products");

  assert.equal(uploadOptions.transformation, undefined);
  assert.equal(uploaded.url, uploaded.originalUrl);
  assert.equal(uploaded.width, 1800);
  assert.equal(uploaded.height, 2400);

  await service.deleteImage(uploaded.publicId);
  assert.equal(deletedPublicId, "products/photo");
});
