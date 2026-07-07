const { 
  Client, GatewayIntentBits, SlashCommandBuilder, Routes, EmbedBuilder, 
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, 
  TextInputBuilder, TextInputStyle, InteractionType 
} = require('discord.js');
const { REST } = require('@discordjs/rest');
const admin = require('firebase-admin');
const express = require('express');
const fs = require('fs');

// 1. Render-Optimized Keep-Alive Web Port
const app = express();
const PORT = process.env.PORT || 10000; // Render assigns its own dynamic port here

app.get('/', (req, res) => {
  res.status(200).json({ status: "ONLINE", timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Render Web Listener successfully bound to internal network interface on port ${PORT}`);
});

// 2. Load Structural Map Settings
const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));

// 3. Initialize Firebase Layer
const serviceAccount = require('./firebase-service-account.json');
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

// 4. Gateway Client Configurations
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ] 
});

/**
 * Real-Time Monitoring Output Trace Link
 */
async function shipTraceReceipt(contentString, embedPayload = null) {
  try {
    const traceChannel = await client.channels.fetch(config.CHANNELS.CORE_TRACE_AUDIT);
    if (!traceChannel) return;
    
    const operationalPayload = {};
    if (contentString) operationalPayload.content = `[SYSTEM LOG TRACE]: ${contentString}`;
    if (embedPayload) operationalPayload.embeds = [embedPayload];
    
    await traceChannel.send(operationalPayload);
  } catch (error) {
    console.error('CRITICAL: Log Trace System Intercepted Error:', error);
  }
}

/**
 * Atomic Firestore Persistent Counter Sequence (#001, #002...)
 */
async function advanceGlobalCaseIndex() {
  const masterCounterRef = db.collection('server_registry').doc('global_metrics');
  let currentAssignedIndex = 1;
  
  await db.runTransaction(async (transaction) => {
    const registrySnapshot = await transaction.get(masterCounterRef);
    if (!registrySnapshot.exists) {
      transaction.set(masterCounterRef, { currentCaseSequence: 1 });
    } else {
      currentAssignedIndex = registrySnapshot.data().currentCaseSequence + 1;
      transaction.update(masterCounterRef, { currentCaseSequence: currentAssignedIndex });
    }
  });
  
  return `#${String(currentAssignedIndex).padStart(3, '0')}`;
}

/**
 * Retrieve or instantiate active database user tracking profiles
 */
async function loadServerProfile(memberId, usernameFallback) {
  const accountRef = db.collection('server_user_profiles').doc(memberId);
  const snapshot = await accountRef.get();
  
  if (!snapshot.exists) {
    const modelProfile = {
      userId: memberId,
      cachedUsername: usernameFallback,
      warning_number: 0,
      ban_number: 0,
      warnings: [],
      punishments: []
    };
    await accountRef.set(modelProfile);
    return modelProfile;
  }
  return snapshot.data();
}

// Global Array Definitions for Commands
const serverCommands = [
  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Process and index a multi-tier profile warning infraction')
    .addUserOption(o => o.setName('user').setDescription('Target handle or Snowflake user ID').setRequired(true))
    .addStringOption(o => o.setName('severity').setDescription('Classification level of breach').setRequired(true)
      .addChoices(
        { name: 'Mild Breach (Auto-Timeout)', value: 'MILD_BREACH' }, 
        { name: 'Moderate Breach (Record Warning)', value: 'MODERATE_BREACH' }, 
        { name: 'Extreme Breach (High-Staff Review Desk)', value: 'EXTREME_BREACH' }
      ))
    .addStringOption(o => o.setName('reason').setDescription('Operational enforcement reason context').setRequired(true))
    .addStringOption(o => o.setName('notes').setDescription('Internal details or notes').setRequired(false)),

  new SlashCommandBuilder()
    .setName('history')
    .setDescription('Pull the complete detailed structural case ledger files for an account')
    .addStringOption(o => o.setName('query').setDescription('User mention or raw string snowflake ID').setRequired(true)),

  new SlashCommandBuilder()
    .setName('addtimeout')
    .setDescription('Manually restrict user communication vectors')
    .addUserOption(o => o.setName('user').setDescription('Target user account').setRequired(true))
    .addIntegerOption(o => o.setName('duration').setDescription('Isolation window metric in minutes').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Operational tracking reason').setRequired(true)),

  new SlashCommandBuilder()
    .setName('staffsummary')
    .setDescription('Displays secure activity matrix summaries across analytical monitoring loops')
].map(cmd => cmd.toJSON());

// Lifecycle Boot Hook
client.once('ready', async () => {
  console.log(`🔒 Active Cluster Connection Established: ${client.user.tag}`);
  try {
    const restInstance = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    await restInstance.put(Routes.applicationCommands(client.user.id), { body: serverCommands });
    console.log('✅ Synchronized Global Server Application Command Infrastructure.');
  } catch (error) {
    console.error('CRITICAL: Command Synchronization Failure:', error);
  }
});

// Primary Operational Event Engine Router
client.on('interactionCreate', async (interaction) => {
  const memberRoles = interaction.member?.roles.cache;
  if (!memberRoles) return;

  const matchAbsolute = memberRoles.has(config.ROLES.OVERSEER_ABSOLUTE);
  const matchConditional = memberRoles.has(config.ROLES.WARDEN_CONDITIONAL);
  const matchLow = memberRoles.has(config.ROLES.GUARDIAN_LOW);

  if (interaction.isChatInputCommand()) {
    const { commandName, options, user, guild } = interaction;

    // Master Clearance Gating Check
    if (!matchAbsolute && !matchConditional && !matchLow) {
      return interaction.reply({ content: '❌ Access Control Block: Ranks lack operational authorization profiles.', ephemeral: true });
    }

    await shipTraceReceipt(`Command \`/${commandName}\` deployed from terminal interface by <@${user.id}>`);

    if (commandName === 'warn') {
      const targetUser = options.getUser('user');
      const severity = options.getString('severity');
      const reason = options.getString('reason');
      const notes = options.getString('notes') || 'None Logged';
      const timestampISO = new Date().toISOString();
      
      const dynamicSignoff = `Signed, ${user.username} (Staff Security Cluster)`;
      const currentCaseCode = await advanceGlobalCaseIndex();
      await loadServerProfile(targetUser.id, targetUser.username);

      if (severity === 'MILD_BREACH') {
        const structuralMember = await guild.members.fetch(targetUser.id).catch(() => null);
        if (structuralMember) {
          await structuralMember.timeout(10 * 60 * 1000, `Mild Account Escalation [${currentCaseCode}]: ${reason}`);
        }

        await db.collection('server_user_profiles').doc(targetUser.id).update({
          punishments: admin.firestore.FieldValue.arrayUnion({
            caseNumber: currentCaseCode, actionType: 'AUTOMATED_TIMEOUT_10M', details: reason, notes: notes, operator: user.tag, timestamp: timestampISO
          })
        });

        const mildLogEmbed = new EmbedBuilder()
          .setTitle("Staff Consequences & Discipline")
          .setColor('#2B2D31')
          .setDescription(`- **Staff Member:** <@${targetUser.id}>\n- **Action:** Automated 10m Timeout (Mild Tier)\n- **Reason:** ${reason}\n- **Notes:** ${notes}`)
          .setAuthor({ name: dynamicSignoff })
          .setFooter({ text: `Infraction ID | ${currentCaseCode}` })
          .setTimestamp();

        await client.channels.cache.get(config.CHANNELS.MOD_LOG).send({ embeds: [mildLogEmbed] });
        await shipTraceReceipt(null, mildLogEmbed);

        return interaction.reply({ content: `✅ Mild infraction documented under file ref \`${currentCaseCode}\`. User isolated for 10 minutes.`, ephemeral: true });
      }

      if (severity === 'MODERATE_BREACH') {
        await db.collection('server_user_profiles').doc(targetUser.id).update({
          warning_number: admin.firestore.FieldValue.increment(1),
          warnings: admin.firestore.FieldValue.arrayUnion({
            caseNumber: currentCaseCode, classification: 'Moderate Infraction', details: reason, notes: notes, operator: user.tag, timestamp: timestampISO
          })
        });

        const modLogEmbed = new EmbedBuilder()
          .setTitle("Staff Consequences & Discipline")
          .setColor('#2B2D31')
          .setDescription(`- **Staff Member:** <@${targetUser.id}>\n- **Action:** Warning Logged (Moderate Tier)\n- **Reason:** ${reason}\n- **Notes:** ${notes}`)
          .setAuthor({ name: dynamicSignoff })
          .setFooter({ text: `Infraction ID | ${currentCaseCode}` })
          .setTimestamp();

        await client.channels.cache.get(config.CHANNELS.MOD_LOG).send({ embeds: [modLogEmbed] });
        await shipTraceReceipt(null, modLogEmbed);

        return interaction.reply({ content: `✅ Moderate infraction entry committed to ledger data file \`${currentCaseCode}\`.`, ephemeral: true });
      }

      if (severity === 'EXTREME_BREACH') {
        const reviewEmbed = new EmbedBuilder()
          .setTitle("🚨 CRITICAL INCIDENT ESCALATION UNIT")
          .setColor('#992D22')
          .setDescription(`**Target Account File:** <@${targetUser.id}> (\`${targetUser.id}\`)\n**Submitting Enforcement Operator:** <@${user.id}>\n\n**Stated Breach Profile:** ${reason}\n**Internal Notes Field:** ${notes}`)
          .setFooter({ text: `Reserved Global Serial Reference ID: ${currentCaseCode}` });

        const deskActionRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`desk_ban_${targetUser.id}_${currentCaseCode}`).setLabel('Authorize Server Ban').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId(`desk_kick_${targetUser.id}_${currentCaseCode}`).setLabel('Authorize Server Kick').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`desk_warn_${targetUser.id}_${currentCaseCode}`).setLabel('Downgrade to Standard Warning').setStyle(ButtonStyle.Primary)
        );

        await client.channels.cache.get(config.CHANNELS.STAFF_REVIEW_DESK).send({
          content: `<@&${config.ROLES.OVERSEER_ABSOLUTE}> <@&${config.ROLES.WARDEN_CONDITIONAL}> - High-Clearance discretion authorization requested for an Extreme breach escalation.`,
          embeds: [reviewEmbed],
          components: [deskActionRow]
        });

        return interaction.reply({ content: `⚠️ Extreme breach indexed under code \`${currentCaseCode}\`. Case pushed to the high-staff review desk for manual discretion processing.`, ephemeral: true });
      }
    }

    if (commandName === 'history') {
      const unifiedQueryString = options.getString('query').replace(/[<@!>]/g, '');
      const dataProfile = await loadServerProfile(unifiedQueryString, 'Unknown Target File ID').catch(() => null);

      if (!dataProfile) {
        return interaction.reply({ content: '❌ System Query Error: Target record could not be read.', ephemeral: true });
      }

      const ledgerEmbedFile = new EmbedBuilder()
        .setTitle(`📂 Detailed Profile Audit: Case Record Ledger`)
        .setColor('#2B2D31')
        .setDescription(`**Target Account Reference Snowflake:** <@${unifiedQueryString}>\n**Active Logged Warnings:** \`${dataProfile.warning_number}\` | **Active Bans:** \`${dataProfile.ban_number}\``);

      const unifiedChronologicalStack = [...(dataProfile.warnings || []), ...(dataProfile.punishments || [])];
      unifiedChronologicalStack.sort((alpha, beta) => new Date(alpha.timestamp) - new Date(beta.timestamp));

      unifiedChronologicalStack.forEach(incident => {
        ledgerEmbedFile.addFields({
          name: `🔹 Case Ref: ${incident.caseNumber} [${incident.actionType || incident.classification}]`,
          value: `- **Reason:** ${incident.details || incident.reason || 'No details stored.'}\n- **Notes:** ${incident.notes || 'N/A'}\n- **Enforcing Staff Agent:** ${incident.operator || incident.issuedBy || 'System'}\n- **Timestamp Date:** \`${(incident.timestamp || '').substring(0, 10)}\``,
          inline: false
        });
      });

      if (unifiedChronologicalStack.length === 0) {
        ledgerEmbedFile.setDescription(`**Target Account Reference Snowflake:** <@${unifiedQueryString}>\n\nFile holds an immaculate profile history sequence.`);
      }

      await shipTraceReceipt(null, ledgerEmbedFile);
      return interaction.reply({ embeds: [ledgerEmbedFile] });
    }

    if (commandName === 'addtimeout') {
      const userAsset = options.getUser('user');
      const durationMetric = options.getInteger('duration');
      const trackingReason = options.getString('reason');
      const trackingCaseCode = await advanceGlobalCaseIndex();
      const currentStamp = new Date().toISOString();

      const memberInstance = await guild.members.fetch(userAsset.id).catch(() => null);
      if (!memberInstance) return interaction.reply({ content: '❌ Target profile instance could not be found.', ephemeral: true });

      await memberInstance.timeout(durationMetric * 60 * 1000, `Manual Action [${trackingCaseCode}]: ${trackingReason}`);
      
      await db.collection('server_user_profiles').doc(userAsset.id).update({
        punishments: admin.firestore.FieldValue.arrayUnion({
          caseNumber: trackingCaseCode, actionType: 'MANUAL_TIMEOUT', details: trackingReason, operator: user.tag, timestamp: currentStamp
        })
      });

      const manualTimeoutEmbed = new EmbedBuilder()
        .setTitle("Staff Consequences & Discipline")
        .setColor('#2B2D31')
        .setDescription(`- **Staff Member:** <@${userAsset.id}>\n- **Action:** Manual Timeout (${durationMetric}m)\n- **Reason:** ${trackingReason}`)
        .setAuthor({ name: `Signed, ${user.username} (Direct Manual Override)` })
        .setFooter({ text: `Infraction ID | ${trackingCaseCode}` })
        .setTimestamp();

      await client.channels.cache.get(config.CHANNELS.MOD_LOG).send({ embeds: [manualTimeoutEmbed] });
      await shipTraceReceipt(null, manualTimeoutEmbed);

      return interaction.reply({ content: `✅ Manual timeout assigned for \`${durationMetric}\` minutes. Entry logged under \`${trackingCaseCode}\`.` });
    }

    if (commandName === 'staffsummary') {
      if (!matchAbsolute && !matchConditional) {
        return interaction.reply({ content: '❌ Security Block: Restricted command.', ephemeral: true });
      }
      return interaction.reply({ content: '📊 **Analytical Performance Log Index**: Server pipeline stable.', ephemeral: true });
    }
  }

  // Button Interactions
  if (interaction.isButton()) {
    const [actionPrefix, resolvedIntent, targetProfileSnowflake, reservedCaseCode] = interaction.customId.split('_');
    if (actionPrefix !== 'desk') return;

    if (!matchAbsolute && !matchConditional) {
      return interaction.reply({ content: '❌ Access Privileges Denied: High-staff permission required.', ephemeral: true });
    }

    const interactiveModalWindow = new ModalBuilder()
      .setCustomId(`modalStructure_${resolvedIntent}_${targetProfileSnowflake}_${reservedCaseCode}`)
      .setTitle(`Process Incident File Reference: ${reservedCaseCode}`);

    const internalTextEntryReason = new TextInputBuilder()
      .setCustomId('textReasonField')
      .setLabel('Documented Reason for Enforcement')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(resolvedIntent === 'ban' && matchConditional); // Warden rule verification requirement

    interactiveModalWindow.addComponents(new ActionRowBuilder().addComponents(internalTextEntryReason));
    await interaction.showModal(interactiveModalWindow);
  }

  // Modal Submissions Layer
  if (interaction.type === InteractionType.ModalSubmit) {
    const [, committedIntent, victimSnowflake, executedCaseRef] = interaction.customId.split('_');
    const providedTextReasonInput = interaction.fields.getTextInputValue('textReasonField');
    const runtimeExecutionStamp = new Date().toISOString();
    const finalAdministrativeSignature = `Signed, ${interaction.user.username} (High-Clearance Desk Resolution)`;

    if (committedIntent === 'ban') {
      if (!providedTextReasonInput && matchConditional) {
        return interaction.reply({ content: '❌ High-Tier Security Abort: Warden roles must supply an explicit reason to execute bans.', ephemeral: true });
      }

      await interaction.guild.members.ban(victimSnowflake, { reason: `Extreme Escalation Desk [${executedCaseRef}]: ${providedTextReasonInput}` }).catch(() => null);
      await loadServerProfile(victimSnowflake, 'Banned Profile Asset');
      
      await db.collection('server_user_profiles').doc(victimSnowflake).update({
        ban_number: admin.firestore.FieldValue.increment(1),
        punishments: admin.firestore.FieldValue.arrayUnion({
          caseNumber: executedCaseRef, actionType: 'PERMANENT_DESK_BAN', details: providedTextReasonInput, operator: interaction.user.tag, timestamp: runtimeExecutionStamp
        })
      });

      const formalBanEmbed = new EmbedBuilder()
        .setTitle("Staff Consequences & Discipline")
        .setColor('#2B2D31')
        .setDescription(`- **Staff Member:** <@${victimSnowflake}>\n- **Action:** Permanent Discretionary Ban\n- **Reason:** ${providedTextReasonInput}`)
        .setAuthor({ name: finalAdministrativeSignature })
        .setFooter({ text: `Infraction ID | ${executedCaseRef}` })
        .setTimestamp();

      await client.channels.cache.get(config.CHANNELS.MOD_LOG).send({ embeds: [formalBanEmbed] });
      await shipTraceReceipt(null, formalBanEmbed);
      
      await interaction.message.delete().catch(() => null);
      return interaction.reply({ content: `🔨 Permanent ban successfully processed for profile case record \`${executedCaseRef}\`.`, ephemeral: true });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
