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

// ===== CONFIG =====
const TOKEN = process.env.TOKEN;
const CLIENT_ID = "1455664767363715293";
const SOLAR_CHANNEL_ID = "1452279184847142932";
const LEADERBOARD_CHANNEL_ID = "1455964097656131708";
const EMOJI = "🌿";
const IMAGE_URL = "https://www.gtabase.com/igallery/gta5-character-art/gtaonline-the-chop-shop-dlc-artwork-1600.png"; // must end with .png/.jpg
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
let points = fs.existsSync("points.json")
  ? JSON.parse(fs.readFileSync("points.json"))
  : {};

const savePoints = () =>
  fs.writeFileSync("points.json", JSON.stringify(points, null, 2));

const trackedMessages = new Map();

// ===== SLASH COMMAND =====
const commands = [
  { name: "my-points", description: "Show your family points" }
];

const rest = new REST({ version: "10" }).setToken(TOKEN);
(async () => {
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  console.log("✅ Slash command registered");
})();

// ===== READY =====
client.once("clientReady", () => {
  console.log("✅ Bot running");

  // 🔥 TEST MODE: EVERY 10 SECONDS
  setInterval(async () => {
    try {
      const channel = await client.channels.fetch(SOLAR_CHANNEL_ID);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("show_points")
          .setLabel("🌿 Show My Points")
          .setStyle(ButtonStyle.Success)
      );

      const msg = await channel.send({
        content:
          "🧪 **TEST MODE**\n\n" +
          "🔧 **Repair all solar panels if planted**\n" +
          "**Bonus will be provided 💰**\n\n" +
          "🟢 *React if repaired*",
        files: [IMAGE_URL],
        components: [row]
      });

      trackedMessages.set(msg.id, new Set());
      await msg.react(EMOJI);

      console.log("⏱️ Reminder sent");
    } catch (e) {
      console.error("Send error:", e);
    }
  }, 10_000);
});

// ===== REACTION POINTS =====
client.on("messageReactionAdd", async (reaction, user) => {
  if (user.bot) return;
  if (reaction.partial) await reaction.fetch();
  if (reaction.emoji.name !== EMOJI) return;

  const msg = reaction.message;
  if (!trackedMessages.has(msg.id)) return;

  const used = trackedMessages.get(msg.id);
  if (used.has(user.id)) return;

  used.add(user.id);
  points[user.id] = (points[user.id] || 0) + 1;
  savePoints();

  // Update leaderboard
  const lb = await client.channels.fetch(LEADERBOARD_CHANNEL_ID);
  const sorted = Object.entries(points).sort((a, b) => b[1] - a[1]);

  let text = "🏆 **FAMILY POINTS LEADERBOARD**\n\n";
  for (let i = 0; i < sorted.length; i++) {
    const u = await client.users.fetch(sorted[i][0]);
    text += `${i + 1}️⃣ ${u.username} — ${sorted[i][1]} 🌿\n`;
  }

  await lb.send(text);
});

// ===== BUTTON + SLASH HANDLER =====
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

  // SLASH COMMAND
  if (interaction.isChatInputCommand() &&
      interaction.commandName === "my-points") {

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

client.login(TOKEN);
