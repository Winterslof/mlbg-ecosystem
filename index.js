const { Client, GatewayIntentBits, SlashCommandBuilder, Routes, EmbedBuilder } = require('discord.js');
const { REST } = require('@discordjs/rest');
const admin = require('firebase-admin');

// 1. Firebase Administration Integration Engine Setup
// Remember to place your generated service account json directly inside your running bot directory root folder!
const serviceAccount = require('./firebase-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// 2. Initialize Discord Client Application Client Core
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
const TOKEN = 'MTUyMzcyODg4MjEzMjQ1MTM2OA.Gagh35.Zjko-5_XjP85fDs_Cs2HmqcnrN5BluEDhKj-Js'; // Swap out for your real bot application token
const CLIENT_ID = '1523728882132451368';   // Swap out for your application client identity id

// 3. Declarative Interlocking Command Array Map Matrix
const commands = [
  new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Submit a suggestion to the MLBG feedback system')
    .addStringOption(opt => opt.setName('title').setDescription('Short title of your suggestion').setRequired(true))
    .addStringOption(opt => opt.setName('details').setDescription('Detailed description').setRequired(true)),

  new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Administrative control tools')
    .addSubcommand(sub => sub.setName('status')
      .setDescription('Update a suggestion status')
      .addStringOption(opt => opt.setName('id').setDescription('The suggestion ID').setRequired(true))
      .addStringOption(opt => opt.setName('state').setDescription('New status state').setRequired(true)
        .addChoices(
          { name: 'Pending', value: 'pending' },
          { name: 'Approved', value: 'approved' },
          { name: 'Partially Approved', value: 'partially-approved' },
          { name: 'Rejected/Archived', value: 'rejected' }
        ))),

  new SlashCommandBuilder()
    .setName('setpassword')
    .setDescription('Secure your bank vault by choosing a Kwami guardian password')
    .addStringOption(opt => opt.setName('kwami').setDescription('Choose your defense Kwami').setRequired(true)
      .addChoices(
        { name: 'Tikki (Ladybug)', value: 'tikki' },
        { name: 'Plagg (Cat)', value: 'plagg' },
        { name: 'Trixx (Fox)', value: 'trixx' },
        { name: 'Wayzz (Turtle)', value: 'wayzz' }
      )),

  new SlashCommandBuilder()
    .setName('rob')
    .setDescription('Attempt to bypass a user vault to steal Miraculous Coins')
    .addUserOption(opt => opt.setName('target').setDescription('The user you want to target').setRequired(true))
].map(command => command.toJSON());

// 4. Processing Interceptor Mechanics Execution Framework
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const { commandName, options } = interaction;

  // SUGGEST LOOP LOGIC
  if (commandName === 'suggest') {
    await interaction.deferReply();
    const title = options.getString('title');
    const details = options.getString('details');
    const suggestionId = Math.random().toString(36).substring(2, 8).toUpperCase();

    await db.collection('suggestions').doc(suggestionId).set({
      id: suggestionId,
      title: title,
      description: details,
      author: interaction.user.tag,
      status: 'pending',
      upvotes: 0
    });

    const embed = new EmbedBuilder()
      .setTitle(`🐞 Suggestion #${suggestionId} Synced`)
      .setColor('#E23B44')
      .setDescription(`**${title}**\n${details}\n\n*Dashboard Pipeline Verified External Real-time Push Completed.*`);

    await interaction.editReply({ embeds: [embed] });
  }

  // DISCORD CONTROL BY-PASS INLINE STATUS COMMAND
  if (commandName === 'admin') {
    if (!interaction.member.permissions.has('ManageGuild')) {
      return interaction.reply({ content: '❌ Access Denied: Staff clearance mismatch.', ephemeral: true });
    }
    const sub = options.getSubcommand();
    if (sub === 'status') {
      const id = options.getString('id').toUpperCase();
      const state = options.getString('state');

      const docRef = db.collection('suggestions').doc(id);
      const targetDoc = await docRef.get();

      if (!targetDoc.exists) return interaction.reply({ content: `❌ Match item failure for #${id}`, ephemeral: true });

      await docRef.update({ status: state });
      await interaction.reply({ content: `✅ State updated successfully to **${state}** for suggest instance #${id}.` });
    }
  }

  // VALUE PROTECTION LOOP
  if (commandName === 'setpassword') {
    const kwami = options.getString('kwami');
    await db.collection('users').doc(interaction.user.id).set({ robPassword: kwami }, { merge: true });
    await interaction.reply({ content: `🔒 Your bank security system is now armed and guarded by **${kwami.toUpperCase()}**.`, ephemeral: true });
  }

  // ROB MATRIX ENGINE
  if (commandName === 'rob') {
    const target = options.getUser('target');
    if (target.id === interaction.user.id) return interaction.reply('Self-sabotage loops are prohibited.');

    const targetDoc = await db.collection('users').doc(target.id).get();
    const targetData = targetDoc.exists ? targetDoc.data() : null;
    const realGuardian = targetData?.robPassword || 'tikki';

    await interaction.reply({
      content: `🕵️‍♂️ **Vault Hack in progress against <@${target.id}>...**\nTo bypass their active network security systems, input your guess as a standard text chat line inside this channel within 15 seconds!\n\nOptions: **tikki**, **plagg**, **trixx**, **wayzz**`
    });

    const filter = m => m.author.id === interaction.user.id && ['tikki', 'plagg', 'trixx', 'wayzz'].includes(m.content.toLowerCase());
    const collector = interaction.channel.createMessageCollector({ filter, time: 15000, max: 1 });

    collector.on('collect', async m => {
      if (m.content.toLowerCase() === realGuardian) {
        await m.reply(`🎉 **CATACLYSM INFILTRATION SUCCESS!** You bypassed the ${realGuardian.toUpperCase()} shield and drained 500 Coins!`);
      } else {
        await m.reply(`🚨 **DETECTION INTRUSION FAILURE!** The ${realGuardian.toUpperCase()} matrix broke your lock. Asset grab aborted.`);
      }
    });
  }
});

// 5. Initial Injection Runner Deployment Core
(async () => {
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    client.login(TOKEN);
    console.log('🐞 MLBG Engine Deployment Verified. Listening for live triggers...');
  } catch (error) {
    console.error(error);
  }
})();
