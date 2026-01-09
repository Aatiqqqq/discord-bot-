const {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");
const fs = require("fs");

// ================= CONFIG =================
const TOKEN = process.env.TOKEN;
const CLIENT_ID = "1455664767363715293";

const SOLAR_CHANNEL_ID = "1452279184847142932";
const LEADERBOARD_CHANNEL_ID = "1455964097656131708";

const IMAGE_URL =
  "https://www.gtabase.com/igallery/gta5-character-art/gtaonline-the-chop-shop-dlc-artwork-1600.png";

const EMOJI = "🌿";
// =========================================

// ================= CLIENT =================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// ================= POINTS STORAGE =================
let points = {};
if (fs.existsSync("points.json")) {
  points = JSON.parse(fs.readFileSync("points.json", "utf8"));
}

function savePoints() {
  fs.writeFileSync("points.json", JSON.stringify(points, null, 2));
}

const trackedMessages = new Map();
let leaderboardMessageId = null;

// ================= SLASH COMMAND =================
const commands = [
  { name: "my-points", description: "Show your family points and rank" }
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), {
      body: commands
    });
    console.log("✅ Slash command registered");
  } catch (err) {
    console.error("Slash command error:", err);
  }
})();

// ================= LEADERBOARD BUILDER =================
async function buildLeaderboard() {
  const sorted = Object.entries(points).sort((a, b) => b[1] - a[1]);
  let text = "🏆 **FAMILY POINTS LEADERBOARD**\n\n";

  if (sorted.length === 0) {
    text += "No family points yet 🌿";
  } else {
    for (let i = 0; i < sorted.length; i++) {
      const user = await client.users.fetch(sorted[i][0]);
      text += `${i + 1}️⃣ ${user.username} — ${sorted[i][1]} 🌿\n`;
    }
  }
  return text;
}

// ================= READY =================
client.once("ready", async () => {
  console.log(`🤖 Bot online as ${client.user.tag}`);

  // Create leaderboard message once
  const leaderboardChannel = await client.channels.fetch(
    LEADERBOARD_CHANNEL_ID
  );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("show_points")
      .setLabel("🌿 Show My Points")
      .setStyle(ButtonStyle.Success)
  );

  const leaderboardMsg = await leaderboardChannel.send({
    content: await buildLeaderboard(),
    components: [row]
  });

  leaderboardMessageId = leaderboardMsg.id;
});

// ================= CLOCK-ALIGNED REMINDER =================
let lastSlot = null; // remembers :00 or :30

setInterval(async () => {
  try {
    const now = new Date();

    // Asia/Kolkata minute
    const minute = Number(
      now.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        minute: "2-digit"
      })
    );

    // Only at :00 or :30
    if (minute !== 0 && minute !== 30) {
      lastSlot = null;
      return;
    }

    // Prevent duplicate in same minute
    if (lastSlot === minute) return;
    lastSlot = minute;

    console.log("⏰ Clock reminder at", minute === 0 ? ":00" : ":30");

    const channel = await client.channels.fetch(SOLAR_CHANNEL_ID);

    const msg = await channel.send({
      content:
        "🔧 **Repair all solar panels if planted**\n" +
        "**Bonus will be provided 💰**\n\n" +
        "🌿 *React if repaired*",
      files: [IMAGE_URL]
    });

    trackedMessages.set(msg.id, new Set());
    await msg.react(EMOJI);

    console.log("✅ Reminder sent");
  } catch (err) {
    console.error("❌ Reminder error:", err);
  }
}, 20 * 1000); // check every 20 seconds

// ================= REACTIONS =================
client.on("messageReactionAdd", async (reaction, user) => {
  try {
    if (reaction.partial) await reaction.fetch();
    if (user.bot) return;
    if (reaction.emoji.name !== EMOJI) return;

    const msg = reaction.message;
    if (!trackedMessages.has
