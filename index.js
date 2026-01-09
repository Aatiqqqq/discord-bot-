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

// Track reminder messages so points count only once per message
const trackedMessages = new Map();
let leaderboardMessageId = null;

// ================= SLASH COMMAND =================
const commands = [
  {
    name: "my-points",
    description: "Show your family points and rank"
  }
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

// ================= REMINDER LOGIC =================
const THIRTY_MINUTES = 30 * 60 * 1000;
let lastSent = Date.now(); // start counting from bot start

// ================= READY =================
client.once("ready", async () => {
  console.log(`🤖 Bot online as ${client.user.tag}`);

  // ===== CREATE LEADERBOARD MESSAGE (ONCE) =====
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

  // ===== REMINDER EVERY 30 MINUTES =====
  setInterval(async () => {
    try {
      const now = Date.now();
      console.log("⏱ interval check", new Date().toLocaleTimeString());

      if (now - lastSent < THIRTY_MINUTES) return;

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

      lastSent = now;
      console.log("✅ Reminder sent");
    } catch (err) {
      console.error("Reminder error:", err);
    }
  }, 60 * 1000); // check every minute
});

// ================= REACTION HANDLER =================
client.on("messageReactionAdd", async (reaction, user) => {
  try {
    if (reaction.partial) await reaction.fetch();
    if (user.bot) return;
    if (reaction.emoji.name !== EMOJI) return;

    const msg = reaction.message;
    if (!trackedMessages.has(msg.id)) return;

    const used = trackedMessages.get(msg.id);
    if (used.has(user.id)) return;

    used.add(user.id);
    points[user.id] = (points[user.id] || 0) + 1;
    savePoints();

    const leaderboardChannel = await client.channels.fetch(
      LEADERBOARD_CHANNEL_ID
    );
    const leaderboardMsg =
      await leaderboardChannel.messages.fetch(leaderboardMessageId);

    leaderboardMsg.edit({
      content: await buildLeaderboard(),
      components: leaderboardMsg.components
    });
  } catch (err) {
    console.error("Reaction error:", err);
  }
});

// ================= INTERACTIONS =================
client.on("interactionCreate", async interaction => {
  // BUTTON
  if (interaction.isButton() && interaction.customId === "show_points") {
    const id = interaction.user.id;

    if (!points[id]) {
      return interaction.reply({
        content: "❌ You have no family points yet.",
        ephemeral: true
      });
    }

    const sorted = Object.entries(points).sort((a, b) => b[1] - a[1]);
    const rank = sorted.findIndex(x => x[0] === id) + 1;

    return interaction.reply({
      ephemeral: true,
      content:
        `🌿 **YOUR FAMILY POINTS**\n\n` +
        `👤 Name: ${interaction.user.username}\n` +
        `🏆 Rank: #${rank}\n` +
        `🌿 Points: ${points[id]} 🌿`
    });
  }

  // /my-points
  if (
    interaction.isChatInputCommand() &&
    interaction.commandName === "my-points"
  ) {
    const id = interaction.user.id;

    if (!points[id]) {
      return interaction.reply({
        content: "❌ You have no family points yet.",
        ephemeral: true
      });
    }

    const sorted = Object.entries(points).sort((a, b) => b[1] - a[1]);
    const rank = sorted.findIndex(x => x[0] === id) + 1;

    interaction.reply({
      ephemeral: true,
      content:
        `🌿 **YOUR FAMILY POINTS**\n\n` +
        `👤 Name: ${interaction.user.username}\n` +
        `🏆 Rank: #${rank}\n` +
        `🌿 Points: ${points[id]} 🌿`
    });
  }
});

// ================= LOGIN =================
client.login(TOKEN);
