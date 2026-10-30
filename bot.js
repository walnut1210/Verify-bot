const { Client, GatewayIntentBits } = require("discord.js");

const { DISCORD_TOKEN, GUILD_ID, VERIFIED_ROLE_ID, WEB_API_URL, WEB_API_SECRET, POLL_INTERVAL_MS = "5000" } = process.env;
for (const [name, value] of Object.entries({ DISCORD_TOKEN, GUILD_ID, VERIFIED_ROLE_ID, WEB_API_URL, WEB_API_SECRET })) {
  if (!value) throw new Error("Missing required environment variable: " + name);
}
if (!WEB_API_URL.startsWith("https://")) throw new Error("WEB_API_URL must use HTTPS.");
if (WEB_API_SECRET.length < 32) throw new Error("WEB_API_SECRET must be at least 32 characters.");

const pollInterval = Math.max(2000, Math.min(Number(POLL_INTERVAL_MS) || 5000, 60000));
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const apiBase = WEB_API_URL.replace(/\/+$/, "");
let polling = false;
let stopped = false;

async function webRequest(route, options = {}) {
  return fetch(apiBase + route, {
    ...options,
    headers: { Authorization: "Bearer " + WEB_API_SECRET, ...(options.headers || {}) },
    signal: AbortSignal.timeout(15000)
  });
}

async function processJob(job) {
  const { jobId, userId, accessToken } = job;
  if (typeof jobId !== "string" || typeof userId !== "string" || !/^\d{17,20}$/.test(userId) || typeof accessToken !== "string") {
    throw new Error("invalid_job_payload");
  }
  const guild = await client.guilds.fetch(GUILD_ID);
  const role = await guild.roles.fetch(VERIFIED_ROLE_ID);
  const botMember = await guild.members.fetchMe();
  if (!role) throw new Error("role_not_found");
  if (role.managed || role.position >= botMember.roles.highest.position) throw new Error("role_hierarchy_invalid");

  const joinResponse = await fetch("https://discord.com/api/v10/guilds/" + GUILD_ID + "/members/" + userId, {
    method: "PUT",
    headers: { Authorization: "Bot " + DISCORD_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: accessToken }),
    signal: AbortSignal.timeout(12000)
  });
  if (!joinResponse.ok && joinResponse.status !== 204) throw new Error("discord_guild_join_http_" + joinResponse.status);
  const member = await guild.members.fetch(userId);
  await member.roles.add(VERIFIED_ROLE_ID, "OAuth2 verification completed");
}

async function pollOnce() {
  if (polling || stopped || !client.isReady()) return;
  polling = true;
  try {
    const response = await webRequest("/internal/jobs/next");
    if (response.status === 204) return;
    if (!response.ok) throw new Error("job_poll_http_" + response.status);
    const job = await response.json();
    try {
      await processJob(job);
      const completed = await webRequest("/internal/jobs/" + encodeURIComponent(job.jobId) + "/complete", { method: "POST" });
      if (!completed.ok) throw new Error("job_complete_http_" + completed.status);
      console.log("Verification job completed:", job.jobId);
    } catch (error) {
      console.error("Verification job failed:", error.message);
      if (typeof job.jobId === "string") {
        try {
          const failed = await webRequest("/internal/jobs/" + encodeURIComponent(job.jobId) + "/fail", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: String(error.message || "verification_failed").slice(0, 120) })
          });
          if (!failed.ok) console.error("Could not report job failure:", failed.status);
        } catch (reportError) { console.error("Could not report job failure:", reportError.message); }
      }
    }
  } catch (error) { console.error("Web job polling error:", error.message); }
  finally { polling = false; }
}

client.once("ready", () => {
  console.log("Discord bot logged in as " + client.user.tag);
  console.log("Polling Verify-web over HTTPS every " + pollInterval + "ms");
  pollOnce();
  setInterval(pollOnce, pollInterval);
});
process.once("SIGINT", () => { stopped = true; client.destroy(); process.exit(0); });
process.once("SIGTERM", () => { stopped = true; client.destroy(); process.exit(0); });
client.login(DISCORD_TOKEN).catch(error => { console.error("Discord login failed:", error.message); process.exit(1); });
