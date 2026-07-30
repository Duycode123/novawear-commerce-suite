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

function requireSecureUrl(name, errors) {
  if (!present(name)) return;
  try {
    const url = new URL(String(process.env[name]).trim());
    if (url.protocol !== "https:" || url.username || url.password) {
      errors.push(`${name} trên production phải là URL HTTPS không chứa thông tin đăng nhập`);
    }
  } catch (_error) {
    errors.push(`${name} không phải là URL hợp lệ`);
  }
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
    const jwtSecret = String(process.env.JWT_SECRET || "");
    if (jwtSecret && Buffer.byteLength(jwtSecret, "utf8") < 32) {
      errors.push("JWT_SECRET trên production phải có ít nhất 32 byte");
    }
    requireSecureUrl("FRONTEND_BASE_URL", errors);
    if (isEnabled("GOOGLE_OAUTH_ENABLED")) {
      ["GOOGLE_REDIRECT_URI", "OAUTH_SUCCESS_URL", "OAUTH_FAILURE_URL"]
        .forEach((name) => requireSecureUrl(name, errors));
    }
    if (isEnabled("FACEBOOK_OAUTH_ENABLED")) {
      ["FACEBOOK_REDIRECT_URI", "OAUTH_SUCCESS_URL", "OAUTH_FAILURE_URL"]
        .forEach((name) => requireSecureUrl(name, errors));
    }
    if (isEnabled("EXPOSE_VERIFICATION_CODE")) {
      errors.push("EXPOSE_VERIFICATION_CODE phải là false trên production");
    }
    if (isEnabled("ALLOW_DEMO_ACCOUNTS")) {
      errors.push("ALLOW_DEMO_ACCOUNTS phải là false trên production");
    }
    const corsOrigins = String(process.env.CORS_ORIGINS || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (corsOrigins.includes("*")) {
      errors.push("CORS_ORIGINS không được chứa * trên production");
    }
    if (corsOrigins.some((origin) => !/^https:\/\//i.test(origin))) {
      errors.push("CORS_ORIGINS trên production chỉ được dùng địa chỉ HTTPS");
    }
    if (dbType === "postgres" && !isEnabled("DB_SSL")) {
      errors.push("DB_SSL phải là true khi dùng PostgreSQL trên production");
    }
    if (dbType === "postgres"
      && String(process.env.DB_SSL_REJECT_UNAUTHORIZED || "true").toLowerCase() === "false") {
      errors.push("DB_SSL_REJECT_UNAUTHORIZED không được là false trên production");
    }
    const jwtExpiresIn = String(process.env.JWT_EXPIRES_IN || "30m").trim();
    const expiryMatch = jwtExpiresIn.match(/^(\d+)([smhd])$/i);
    const expiryUnitSeconds = { s: 1, m: 60, h: 3600, d: 86400 };
    const expirySeconds = expiryMatch
      ? Number(expiryMatch[1]) * expiryUnitSeconds[expiryMatch[2].toLowerCase()]
      : 0;
    if (!expirySeconds || expirySeconds < 5 * 60 || expirySeconds > 24 * 60 * 60) {
      errors.push("JWT_EXPIRES_IN trên production phải từ 5 phút đến 24 giờ (ví dụ: 30m)");
    }
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
