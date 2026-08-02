const crypto = require("crypto");

function enabled(value) {
  return String(value || "false").toLowerCase() === "true";
}

function publicCallbackUri(provider, configuredUri) {
  const configuredOrigin = String(process.env.OAUTH_PUBLIC_ORIGIN || "").trim().replace(/\/$/, "");
  let publicOrigin = configuredOrigin;
  if (!publicOrigin) {
    try {
      const successUrl = new URL(String(process.env.OAUTH_SUCCESS_URL || ""));
      if (!["localhost", "127.0.0.1"].includes(successUrl.hostname)) publicOrigin = successUrl.origin;
    } catch (_error) {
      publicOrigin = "";
    }
  }
  return publicOrigin ? `${publicOrigin}/api/auth/${provider}/callback` : configuredUri;
}

function createOAuthService(options = {}) {
  const request = options.fetch || global.fetch;
  const providers = {
    google: {
      enabled: enabled(process.env.GOOGLE_OAUTH_ENABLED),
      clientId: String(process.env.GOOGLE_CLIENT_ID || "").trim(),
      clientSecret: String(process.env.GOOGLE_CLIENT_SECRET || "").trim(),
      redirectUri: publicCallbackUri("google", String(process.env.GOOGLE_REDIRECT_URI || "").trim()),
    },
    facebook: {
      enabled: enabled(process.env.FACEBOOK_OAUTH_ENABLED),
      clientId: String(process.env.FACEBOOK_CLIENT_ID || "").trim(),
      clientSecret: String(process.env.FACEBOOK_CLIENT_SECRET || "").trim(),
      redirectUri: publicCallbackUri("facebook", String(process.env.FACEBOOK_REDIRECT_URI || "").trim()),
      graphVersion: String(process.env.FACEBOOK_GRAPH_VERSION || "v20.0").trim(),
    },
  };

  function isConfigured(provider) {
    const config = providers[provider];
    return Boolean(config?.enabled && config.clientId && config.clientSecret && config.redirectUri);
  }

  function publicConfig() {
    return {
      google: isConfigured("google"),
      facebook: isConfigured("facebook"),
    };
  }

  function authorizationUrl(provider, state, codeChallenge) {
    const config = providers[provider];
    if (!isConfigured(provider)) throw new Error("OAUTH_PROVIDER_NOT_CONFIGURED");
    if (provider === "google") {
      const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      url.search = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: "code",
        scope: "openid email profile",
        state,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        prompt: "select_account",
      }).toString();
      return url.toString();
    }
    const url = new URL(`https://www.facebook.com/${config.graphVersion}/dialog/oauth`);
    url.search = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      scope: "email,public_profile",
      state,
    }).toString();
    return url.toString();
  }

  async function readJson(response) {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error_description || payload.error?.message || "OAuth provider request failed.");
      error.code = "OAUTH_PROVIDER_ERROR";
      throw error;
    }
    return payload;
  }

  async function exchangeGoogle(code, verifier) {
    const config = providers.google;
    const response = await request("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
        code,
        code_verifier: verifier,
      }),
    });
    const token = await readJson(response);
    const profileResponse = await request("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const profile = await readJson(profileResponse);
    if (!profile.email || !profile.email_verified) {
      const error = new Error("Google account must have a verified email.");
      error.code = "OAUTH_EMAIL_NOT_VERIFIED";
      throw error;
    }
    return {
      providerId: String(profile.sub),
      email: String(profile.email).toLowerCase(),
      emailVerified: true,
      name: String(profile.name || profile.email.split("@")[0]),
      avatar: String(profile.picture || ""),
    };
  }

  async function exchangeFacebook(code) {
    const config = providers.facebook;
    const tokenUrl = new URL(`https://graph.facebook.com/${config.graphVersion}/oauth/access_token`);
    tokenUrl.search = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      code,
    }).toString();
    const token = await readJson(await request(tokenUrl));
    const profileUrl = new URL(`https://graph.facebook.com/${config.graphVersion}/me`);
    profileUrl.search = new URLSearchParams({
      fields: "id,name,email,picture.type(large)",
      access_token: token.access_token,
    }).toString();
    const profile = await readJson(await request(profileUrl));
    if (!profile.email) {
      const error = new Error("Facebook account did not provide an email address.");
      error.code = "OAUTH_EMAIL_REQUIRED";
      throw error;
    }
    return {
      providerId: String(profile.id),
      email: String(profile.email).toLowerCase(),
      // Facebook's basic profile response does not provide a trustworthy
      // email-verification claim. NOVAWEAR confirms ownership by email OTP
      // before activating a new account from this provider.
      emailVerified: false,
      name: String(profile.name || profile.email.split("@")[0]),
      avatar: String(profile.picture?.data?.url || ""),
    };
  }

  async function exchange(provider, code, verifier) {
    if (!isConfigured(provider)) throw new Error("OAUTH_PROVIDER_NOT_CONFIGURED");
    if (provider === "google") return exchangeGoogle(code, verifier);
    if (provider === "facebook") return exchangeFacebook(code);
    throw new Error("OAUTH_PROVIDER_NOT_SUPPORTED");
  }

  return {
    providers,
    isConfigured,
    publicConfig,
    authorizationUrl,
    exchange,
    createVerifier: () => crypto.randomBytes(48).toString("base64url"),
    createChallenge: (verifier) => crypto.createHash("sha256").update(verifier).digest("base64url"),
  };
}

module.exports = { createOAuthService };
