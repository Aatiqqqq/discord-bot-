const {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes
} = require("discord.js");
const fs = require("fs");

// ===== CONFIG =====
const TOKEN = process.env.TOKEN;
const CLIENT_ID = "1455664767363715293";
const SOLAR_CHANNEL_ID = "1452279184847142932";
const LEADERBOARD_CHANNEL_ID = "1455964097656131708";
const EMOJI = "🌿";
// ==================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// ===== LOAD POINTS =====
let points = {};
if (fs.existsSync("points.json")) {
  points = JSON.parse(fs.readFileSync("points.json"));
}
const savePoints = () =>
  fs.writeFileSync("points.json", JSON.stringify(points, null, 2));

// Track reminder messages
const trackedMessages = new Map();

// ===== REGISTER SLASH COMMAND =====
const commands = [
  {
    name: "my-points",
    description: "Show your family points and rank"
  }
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );
    console.log("✅ Slash command registered");
  } catch (err) {
    console.error("Slash command error:", err);
  }
})();

// ===== BOT READY =====
client.once("clientReady", () => {
  console.log("✅ Bot logged in and running");

  // 🔥 TEST MODE — EVERY 10 SECONDS
  setInterval(async () => {
    try {
      const channel = await client.channels.fetch(SOLAR_CHANNEL_ID);
      if (!channel) return;

      const msg = await channel.send(
        "🧪 **TEST MODE**\n\n" +
        "🔧 **Repair all solar panels if planted**\n" +
        "**Bonus will be provided 💰**\n\n" +
        "🟢 *React if repaired*"
      );

      trackedMessages.set(msg.id, new Set());
      await msg.react(EMOJI);

      console.log("⏱️ Test reminder sent");
    } catch (err) {
      console.error("Send error:", err);
    }
  }, 10_000);
});

// ===== REACTION HANDLER =====
client.on("messageReactionAdd", async (reaction, user) => {
  if (user.bot) return;
  if (reaction.partial) await reaction.fetch();
  if (reaction.emoji.name !== EMOJI) return;

  const msg = reaction.message;
  if (!trackedMessages.has(msg.id)) return;

  const reactedUsers = trackedMessages.get(msg.id);
  if (reactedUsers.has(user.id)) return;

  reactedUsers.add(user.id);
  points[user.id] = (points[user.id] || 0) + 1;
  savePoints();

  // Update leaderboard
  const leaderboardChannel =
    await client.channels.fetch(LEADERBOARD_CHANNEL_ID);

  const sorted = Object.entries(points)
    .sort((a, b) => b[1] - a[1]);

  let text = "🏆 **FAMILY POINTS LEADERBOARD**\n\n";
  for (let i = 0; i < sorted.length; i++) {
    const u = await client.users.fetch(sorted[i][0]);
    text += `${i + 1}️⃣ ${u.username} — ${sorted[i][1]} 🌿\n`;
  }

  await leaderboardChannel.send(text);
});

// ===== /my-points COMMAND =====
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "my-points") {
    const id = interaction.user.id;

    if (!points[id]) {
      return interaction.reply({
        content: "❌ You have no family points yet.",
        ephemeral: true
      });
    }

    const sorted = Object.entries(points)
      .sort((a, b) => b[1] - a[1]);

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

// ===== LOGIN =====
client.login(TOKEN);
