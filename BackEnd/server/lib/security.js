const crypto = require("crypto");

const HASH_PREFIX = "scrypt";

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `${HASH_PREFIX}:${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== "string") return false;
  const [prefix, salt, expectedHex] = storedHash.split(":");
  if (prefix !== HASH_PREFIX || !salt || !expectedHex) return false;

  const actual = crypto.scryptSync(String(password), salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function sanitizeUser(user) {
  if (!user) return null;
  const {
    passwordHash,
    verificationCodeHash,
    verificationExpiresAt,
    verificationAttempts,
    verificationSentAt,
    ...safeUser
  } = user;
  return {
    ...safeUser,
    verified: Boolean(user.emailVerifiedAt),
  };
}

module.exports = {
  hashPassword,
  verifyPassword,
  sanitizeUser,
};
