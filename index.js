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

// ========= CONFIG =========
const TOKEN = process.env.TOKEN;
const CLIENT_ID = "1455664767363715293";
const SOLAR_CHANNEL_ID = "1452279184847142932";
const LEADERBOARD_CHANNEL_ID = "1455964097656131708";
const IMAGE_URL = "https://www.gtabase.com/igallery/gta5-character-art/gtaonline-the-chop-shop-dlc-artwork-1600.png"; // .png or .jpg
const EMOJI = "🌿";
// ==========================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// ===== LOAD POINTS =====
let points = fs.existsSync("points.json")
  ? JSON.parse(fs.readFileSync("points.json"))
  : {};

const savePoints = () =>
  fs.writeFileSync("points.json", JSON.stringify(points, null, 2));

const trackedMessages = new Map();
let leaderboardMessageId = null;

// ===== SLASH COMMAND =====
const commands = [
  { name: "my-points", description: "Show your family points and rank" }
];

const rest = new REST({ version: "10" }).setToken(TOKEN);
(async () => {
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
})();

// ===== BUILD LEADERBOARD =====
async function buildLeaderboard() {
  const sorted = Object.entries(points).sort((a, b) => b[1] - a[1]);
  let text = "🏆 **FAMILY POINTS LEADERBOARD**\n\n";

  if (!sorted.length) {
    text += "No family points yet 🌿";
  } else {
    for (let i = 0; i < sorted.length; i++) {
      const u = await client.users.fetch(sorted[i][0]);
      text += `${i + 1}️⃣ ${u.username} — ${sorted[i][1]} 🌿\n`;
    }
  }
  return text;
}

// ===== READY =====
client.once("clientReady", async () => {
  console.log("✅ Bot running (PRODUCTION MODE)");

  // 🏆 CREATE LEADERBOARD MESSAGE ONCE
  const leaderboardChannel = await client.channels.fetch(LEADERBOARD_CHANNEL_ID);

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

  // ⏰ REMINDER EVERY 30 MIN (LONDON TIME)
  setInterval(async () => {
    try {
      const minute = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/London",
        minute: "2-digit"
      }).format(new Date());

      if (minute !== "00" && minute !== "30") return;

      const solarChannel = await client.channels.fetch(SOLAR_CHANNEL_ID);

      const msg = await solarChannel.send({
        content:
          "🔧 **Repair all solar panels if planted**\n" +
          "**Bonus will be provided 💰**\n\n" +
          "🟢 *React if repaired*",
        files: [IMAGE_URL]
      });

      trackedMessages.set(msg.id, new Set());
      await msg.react(EMOJI);

      console.log("🔔 Reminder sent (30 min)");
    } catch (e) {
      console.error("Reminder error:", e);
    }
  }, 60 * 1000);
});

// ===== REACTION HANDLER =====
client.on("messageReactionAdd", async (reaction, user) => {
  if (user.bot) return;
  if (reaction.partial) await reaction.fetch();
  if (reaction.emoji.name !== EMOJI) return;

  const msg = reaction.message;
  if (!trackedMessages.has(msg.id)) return;

  const used = trackedMessages.get(msg.id);
  if (used.has(user.id)) return
