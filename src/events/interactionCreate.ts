import { Collection, Events, Interaction, MessageFlags } from "discord.js";
import { Event, ExtendedClient } from "../types/index.js";
import { getChannelRestrictions } from "../services/settings.js";
import { getCommandRoles } from "../services/moderation.js";

const event: Event = {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction) {
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
