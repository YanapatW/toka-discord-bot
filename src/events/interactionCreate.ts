import { Collection, Events, Interaction, MessageFlags } from "discord.js";
import { Event, ExtendedClient } from "../types/index.js";
import { getChannelRestrictions } from "../services/settings.js";
import { getCommandRoles } from "../services/moderation.js";
import { getPollByMessageId, getPollResults, vote, endPoll } from "../services/poll.js";
import { buildPollEmbed, buildPollButtons } from "../commands/utility/poll.js";

const event: Event = {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction) {
    // Button interaction handler
    if (interaction.isButton()) {
      const customId = interaction.customId;

      if (customId.startsWith("poll_vote_")) {
        const parts = customId.split("_");
        const optionIndex = parseInt(parts[3], 10);

        const poll = await getPollByMessageId(interaction.message.id);
        if (!poll || !poll.active) {
          await interaction.reply({
            content: "This poll has ended.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const option = poll.options[optionIndex];
        if (!option) return;

        await vote(poll.id, interaction.user.id, option.id);

        const updated = await getPollResults(poll.id);
        if (!updated) return;

        const voteCounts = new Map<number, number>();
        updated.options.forEach((o, i) => voteCounts.set(i, o._count.votes));

        const embed = buildPollEmbed(
          updated.question,
          updated.options.map((o) => o.label),
          voteCounts,
          updated._count.votes
        );

        await interaction.update({
          embeds: [embed],
          components: buildPollButtons(
            updated.id,
            updated.options.map((o) => o.label),
            true
          ),
        });
        return;
      }

      if (customId.startsWith("poll_end_")) {
        const poll = await getPollByMessageId(interaction.message.id);
        if (!poll) return;

        if (interaction.user.id !== poll.creatorId) {
          await interaction.reply({
            content: "Only the poll creator can end this poll.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        await endPoll(poll.id);

        const updated = await getPollResults(poll.id);
        if (!updated) return;

        const voteCounts = new Map<number, number>();
        updated.options.forEach((o, i) => voteCounts.set(i, o._count.votes));

        const embed = buildPollEmbed(
          updated.question,
          updated.options.map((o) => o.label),
          voteCounts,
          updated._count.votes
        ).setFooter({ text: `Poll ended — ${updated._count.votes} total votes` });

        await interaction.update({
          embeds: [embed],
          components: buildPollButtons(
            updated.id,
            updated.options.map((o) => o.label),
            false
          ),
        });
        return;
      }

      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const client = interaction.client as ExtendedClient;
    const command = client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`No command matching ${interaction.commandName} found.`);
      return;
    }

    // Channel restriction check
    if (interaction.guildId) {
      const allowedChannels = await getChannelRestrictions(
        interaction.guildId,
        interaction.commandName
      );

      if (allowedChannels.length > 0 && !allowedChannels.includes(interaction.channelId)) {
        const channelMentions = allowedChannels.map((id) => `<#${id}>`).join(", ");
        await interaction.reply({
          content: `This command can only be used in ${channelMentions}`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }

    // Custom role permission check (moderation commands only)
    if (interaction.guildId && interaction.member) {
      const allowedRoles = await getCommandRoles(
        interaction.guildId,
        interaction.commandName
      );

      if (allowedRoles.length > 0) {
        const memberRoles = Array.isArray(interaction.member.roles)
          ? interaction.member.roles
          : [...interaction.member.roles.cache.keys()];

        const hasRole = allowedRoles.some((roleId) =>
          memberRoles.includes(roleId)
        );

        if (!hasRole) {
          await interaction.reply({
            content: "You don't have permission to use this command.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
      }
    }

    // Cooldown check
    const { cooldowns } = client;

    if (!cooldowns.has(command.data.name)) {
      cooldowns.set(command.data.name, new Collection());
    }

    const now = Date.now();
    const timestamps = cooldowns.get(command.data.name)!;
    const cooldownAmount = (command.cooldown ?? 0) * 1000;

    if (cooldownAmount > 0 && timestamps.has(interaction.user.id)) {
      const expirationTime = timestamps.get(interaction.user.id)! + cooldownAmount;

      if (now < expirationTime) {
        const expiredTimestamp = Math.round(expirationTime / 1000);
        await interaction.reply({
          content: `Please wait — you can use \`/${command.data.name}\` again <t:${expiredTimestamp}:R>.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }

    timestamps.set(interaction.user.id, now);
    setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

    // Execute command
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`Error executing ${interaction.commandName}:`, error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: "There was an error executing this command.", flags: MessageFlags.Ephemeral });
      } else {
        await interaction.reply({ content: "There was an error executing this command.", flags: MessageFlags.Ephemeral });
      }
    }
  },
};

export default event;
