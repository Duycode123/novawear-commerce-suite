function isEnabled(name) {
  return String(process.env[name] || "false").toLowerCase() === "true";
}

function present(name) {
  const value = String(process.env[name] || "").trim();
  return Boolean(value && !/replace-with|your-|example/i.test(value));
}

function requireWhen(condition, names, label, errors) {
  if (!condition) return;
  const missing = names.filter((name) => !present(name));
  if (missing.length) errors.push(`${label} thiếu: ${missing.join(", ")}`);
}

function validateEnvironment() {
  const errors = [];
  const dbType = String(process.env.DB_TYPE || "json").toLowerCase();
  if (!["json", "postgres"].includes(dbType)) {
    errors.push("DB_TYPE chỉ nhận giá trị json hoặc postgres");
  }
  requireWhen(dbType === "postgres", ["DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME"], "PostgreSQL", errors);
  requireWhen(
    isEnabled("GOOGLE_OAUTH_ENABLED"),
    ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI", "OAUTH_SUCCESS_URL", "OAUTH_FAILURE_URL"],
    "Google OAuth",
    errors,
  );
  requireWhen(
    isEnabled("FACEBOOK_OAUTH_ENABLED"),
    ["FACEBOOK_CLIENT_ID", "FACEBOOK_CLIENT_SECRET", "FACEBOOK_REDIRECT_URI", "OAUTH_SUCCESS_URL", "OAUTH_FAILURE_URL"],
    "Facebook OAuth",
    errors,
  );
  const cloudinaryCredentials = present("CLOUDINARY_URL")
    || (present("CLOUDINARY_CLOUD_NAME") && present("CLOUDINARY_API_KEY") && present("CLOUDINARY_API_SECRET"));
  if (isEnabled("CLOUDINARY_ENABLED") && !cloudinaryCredentials) {
    errors.push("Cloudinary cần CLOUDINARY_URL hoặc đủ CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET");
  }
  requireWhen(
    isEnabled("SEPAY_API_POLLING_ENABLED"),
    ["SEPAY_API_ACCESS_TOKEN", "SEPAY_API_ACCOUNT_NUMBER", "SEPAY_QR_BANK_ACCOUNT", "SEPAY_QR_BANK_CODE"],
    "SePay API",
    errors,
  );
  if (process.env.NODE_ENV === "production") {
    requireWhen(true, ["JWT_SECRET", "FRONTEND_BASE_URL", "CORS_ORIGINS"], "Production", errors);
    if (!isEnabled("ALLOW_DEMO_ACCOUNTS")) {
      requireWhen(
        true,
        ["BOOTSTRAP_ADMIN_EMAIL", "BOOTSTRAP_ADMIN_PASSWORD", "BOOTSTRAP_ADMIN_PASSWORD_VERSION"],
        "Tài khoản quản trị production",
        errors,
      );
      const bootstrapPassword = String(process.env.BOOTSTRAP_ADMIN_PASSWORD || "");
      if (bootstrapPassword && !(
        bootstrapPassword.length >= 14
        && bootstrapPassword.length <= 128
        && /[a-z]/.test(bootstrapPassword)
        && /[A-Z]/.test(bootstrapPassword)
        && /\d/.test(bootstrapPassword)
        && /[^A-Za-z0-9]/.test(bootstrapPassword)
      )) {
        errors.push("BOOTSTRAP_ADMIN_PASSWORD cần 14-128 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt");
      }
    }
  }
  if (errors.length) {
    throw new Error(`Cấu hình môi trường không hợp lệ:\n- ${errors.join("\n- ")}`);
  }
}

module.exports = { validateEnvironment, present };
