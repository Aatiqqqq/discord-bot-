const {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} = require("discord.js");
const fs = require("fs");

// ========= CONFIG =========
const TOKEN = process.env.TOKEN;
const CLIENT_ID = "1455664767363715293";
const SOLAR_CHANNEL_ID = "1452279184847142932";
const LEADERBOARD_CHANNEL_ID = "1455964097656131708";
const REACTION_EMOJI = "🌿";
// ==========================

if (!TOKEN) {
  console.error("TOKEN missing");
  process.exit(1);
}

// ===== CLIENT =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// ===== DATA =====
let points = fs.existsSync("points.json")
  ? JSON.parse(fs.readFileSync("points.json"))
  : {};

let leaderboardData = fs.existsSync("leaderboard.json")
  ? JSON.parse(fs.readFileSync("leaderboard.json"))
  : {};

const savePoints = () =>
  fs.writeFileSync("points.json", JSON.stringify(points, null, 2));

const saveLeaderboard = () =>
  fs.writeFileSync("leaderboard.json", JSON.stringify(leaderboardData, null, 2));

const trackedMessages = new Map();

// ===== SLASH COMMAND (ADMIN) =====
const commands = [
  {
    name: "remove-points",
    description: "Admin only: remove family points",
    options: [
      { name: "user", type: 6, required: true },
      { name: "amount", type: 4, required: true }
    ]
  }
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
    text += "No points yet 🌿";
  } else {
    for (let i = 0; i < sorted.length; i++) {
      const user = await client.users.fetch(sorted[i][0]);
      text += `${i + 1}️⃣ ${user.username} — ${sorted[i][1]} 🌿\n`;
    }
  }
  return text;
}

// ===== READY =====
client.once("clientReady", () => {
{
  console.log(`Logged in as ${client.user.tag}`);

  const leaderboardChannel = await client.channels.fetch(LEADERBOARD_CHANNEL_ID);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("my_points")
      .setLabel("🌿 Show My Points")
      .setStyle(ButtonStyle.Success)
  );

  // 🔒 LOAD OR CREATE LEADERBOARD MESSAGE
  if (leaderboardData.messageId) {
    try {
      const msg = await leaderboardChannel.messages.fetch(leaderboardData.messageId);
      await msg.edit({
        content: await buildLeaderboard(),
        components: [row]
      });
    } catch {
      leaderboardData.messageId = null;
    }
  }

  if (!leaderboardData.messageId) {
    const msg = await leaderboardChannel.send({
      content: await buildLeaderboard(),
      components: [row]
    });
    leaderboardData.messageId = msg.id;
    saveLeaderboard();
  }

  // 🔁 REMINDER LOOP
client.once("clientReady", async () => {
  console.log("Bot ready test");

  try {
    const channel = await client.channels.fetch(SOLAR_CHANNEL_ID);
    await channel.send("✅ BOT TEST MESSAGE — THIS SHOULD APPEAR IMMEDIATELY");
    console.log("Test message sent");
  } catch (err) {
    console.error("Send failed:", err);
  }
});


// ===== REACTION HANDLER =====
client.on("messageReactionAdd", async (reaction, user) => {
  if (user.bot) return;
  if (reaction.partial) await reaction.fetch();
  if (reaction.emoji.name !== REACTION_EMOJI) return;

  const msg = reaction.message;
  if (!trackedMessages.has(msg.id)) return;

  const users = trackedMessages.get(msg.id);
  if (users.has(user.id)) return;

  users.add(user.id);
  points[user.id] = (points[user.id] || 0) + 1;
  savePoints();

  const leaderboardChannel = await client.channels.fetch(LEADERBOARD_CHANNEL_ID);
  const leaderboardMsg = await leaderboardChannel.messages.fetch(leaderboardData.messageId);

  leaderboardMsg.edit({
    content: await buildLeaderboard(),
    components: leaderboardMsg.components
  });
});

// ===== INTERACTIONS =====
client.on("interactionCreate", async interaction => {

  // BUTTON
  if (interaction.isButton() && interaction.customId === "my_points") {
    const id = interaction.user.id;
    if (!points[id]) {
      return interaction.reply({
        content: "❌ You have no points yet.",
        flags: MessageFlags.Ephemeral
      });
    }

    const sorted = Object.entries(points).sort((a, b) => b[1] - a[1]);
    const rank = sorted.findIndex(x => x[0] === id) + 1;

    return interaction.reply({
      flags: MessageFlags.Ephemeral,
      content:
        `🌿 **YOUR FAMILY POINTS**\n\n` +
        `👤 Name: ${interaction.user.username}\n` +
        `🏆 Rank: #${rank}\n` +
        `🌿 Points: ${points[id]} 🌿`
    });
  }

  // ADMIN REMOVE
  if (interaction.isChatInputCommand() &&
      interaction.commandName === "remove-points") {

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({
        content: "Admin only",
        flags: MessageFlags.Ephemeral
      });
    }

    const user = interaction.options.getUser("user");
    const amount = interaction.options.getInteger("amount");

    points[user.id] = Math.max((points[user.id] || 0) - amount, 0);
    savePoints();

    interaction.reply(`Removed ${amount} 🌿 from ${user.username}`);
  }
});

client.login(TOKEN);
