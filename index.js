const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

// ========= CONFIG =========
const TOKEN = process.env.TOKEN;
const CLIENT_ID = "1455664767363715293";
const REQUEST_ROLE_CHANNEL_ID = "1454175656182288596";
const LOGS_CHANNEL_ID = "1433167140201955581";
// ==========================

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ===== REGISTER SLASH COMMAND (ADMIN USE ONLY) =====
const commands = [
  {
    name: "setup-application",
    description: "Post application panel in request-role channel"
  }
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    { body: commands }
  );
  console.log("✅ Slash command registered");
})();

// ===== READY =====
client.once("clientReady", async () => {
  console.log("✅ Family Application Bot Online");

  // 🔒 AUTO-POST PANEL (ENSURES IT EXISTS)
  const channel = await client.channels.fetch(REQUEST_ROLE_CHANNEL_ID);

  const embed = new EmbedBuilder()
    .setColor(0xff0000)
    .setTitle("👑 Welcome to Family")
    .setDescription(
      "Please fill your data **correctly** by pressing the button below.\n\n" +
      "📋 **Family Role Application**"
    )
    .setFooter({ text: "Family Application System" });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("open_application")
      .setLabel("✍️ Fill Application")
      .setStyle(ButtonStyle.Primary)
  );

  await channel.send({
    embeds: [embed],
    components: [row]
  });

  console.log("📌 Application panel posted in request-role");
});

// ===== INTERACTIONS =====
client.on("interactionCreate", async interaction => {

  /* ───── OPEN MODAL ───── */
  if (interaction.isButton() &&
      interaction.customId === "open_application") {

    const modal = new ModalBuilder()
      .setCustomId("family_application")
      .setTitle("Family Application");

    const nameInput = new TextInputBuilder()
      .setCustomId("name")
      .setLabel("👤 Name")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const regionInput = new TextInputBuilder()
      .setCustomId("region")
      .setLabel("🌍 Region")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const ignInput = new TextInputBuilder()
      .setCustomId("ign")
      .setLabel("🎮 In-Game Name")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(nameInput),
      new ActionRowBuilder().addComponents(regionInput),
      new ActionRowBuilder().addComponents(ignInput)
    );

    return interaction.showModal(modal);
  }

  /* ───── FORM SUBMISSION ───── */
  if (interaction.isModalSubmit() &&
      interaction.customId === "family_application") {

    const name = interaction.fields.getTextInputValue("name");
    const region = interaction.fields.getTextInputValue("region");
    const ign = interaction.fields.getTextInputValue("ign");

    const logsChannel = await client.channels.fetch(LOGS_CHANNEL_ID);

    const embed = new EmbedBuilder()
      .setColor(0x00ff99)
      .setTitle("📥 New Family Application")
      .addFields(
        { name: "👤 Name", value: name, inline: true },
        { name: "🌍 Region", value: region, inline: true },
        { name: "🎮 In-Game Name", value: ign, inline: true },
        { name: "👤 Discord User", value: interaction.user.tag, inline: false }
      )
      .setTimestamp();

    await logsChannel.send({ embeds: [embed] });

    return interaction.reply({
      content: "✅ Your application has been submitted successfully!",
      ephemeral: true
    });
  }
});

client.login(TOKEN);
