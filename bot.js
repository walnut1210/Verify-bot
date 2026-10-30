const express = require("express");
const { Client, GatewayIntentBits } = require("discord.js");
const { rateLimit } = require("express-rate-limit");
const crypto = require("crypto");

const {
  DISCORD_TOKEN,
  GUILD_ID,
  VERIFIED_ROLE_ID,
  API_SECRET,
  PORT = 3001
} = process.env;

for (const [name, value] of Object.entries({
  DISCORD_TOKEN, GUILD_ID, VERIFIED_ROLE_ID, API_SECRET
})) {
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
}
if (API_SECRET.length < 32) {
  throw new Error("API_SECRET must be at least 32 characters.");
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "10kb" }));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false
});

function safeEqual(a, b) {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

app.get("/health", (req, res) => res.json({ ok: true }));

app.post("/api/verify", limiter, async (req, res) => {
  const auth = req.get("authorization") || "";
  const suppliedSecret = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!safeEqual(suppliedSecret, API_SECRET)) {
    return res.status(401).json({ success: false, error: "unauthorized" });
  }

  const { userId, accessToken } = req.body || {};
  if (typeof userId !== "string" || !/^\d{17,20}$/.test(userId) ||
      typeof accessToken !== "string" || accessToken.length < 20 ||
      accessToken.length > 4096) {
    return res.status(400).json({ success: false, error: "invalid_request" });
  }

  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const role = await guild.roles.fetch(VERIFIED_ROLE_ID);
    const botMember = await guild.members.fetchMe();

    if (!role) {
      return res.status(500).json({ success: false, error: "role_not_found" });
    }
    if (role.managed || role.position >= botMember.roles.highest.position) {
      return res.status(500).json({ success: false, error: "role_hierarchy_invalid" });
    }

    // OAuth2 guilds.join: the bot must already be a member of the target guild.
    // The access token is used only for this request and is never persisted or logged.
    const joinResponse = await fetch(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bot ${DISCORD_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ access_token: accessToken }),
        signal: AbortSignal.timeout(12000)
      }
    );

    if (!joinResponse.ok && joinResponse.status !== 204) {
      const detail = await joinResponse.text();
      console.error("Discord add-member failed:", joinResponse.status, detail.slice(0, 300));
      return res.status(502).json({ success: false, error: "guild_join_failed" });
    }

    const member = await guild.members.fetch(userId);
    await member.roles.add(VERIFIED_ROLE_ID, "OAuth2 verification completed");
    return res.json({ success: true });
  } catch (error) {
    console.error("Verification API error:", error.message);
    return res.status(500).json({ success: false, error: "verification_failed" });
  }
});

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`Bot API listening on port ${PORT}`);
});

client.once("ready", () => {
  console.log(`Discord bot logged in as ${client.user.tag}`);
});

client.login(DISCORD_TOKEN).catch((error) => {
  console.error("Discord login failed:", error.message);
  process.exit(1);
});
