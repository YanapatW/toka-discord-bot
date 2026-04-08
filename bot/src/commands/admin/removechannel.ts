import {
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import { removeChannelRestriction } from "../../services/settings.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("removechannel")
    .setDescription("Remove a channel restriction from a command")
    .addStringOption((option) =>
      option
        .setName("command")
        .setDescription("Command name")
        .setRequired(true)
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Channel to remove restriction from")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    const commandName = interaction.options.getString("command", true);
    const channel = interaction.options.getChannel("channel", true);

    const removed = await removeChannelRestriction(
      interaction.guildId!,
      commandName,
      channel.id
    );

    if (removed) {
      await interaction.reply({
        content: `Removed <#${channel.id}> restriction from \`/${commandName}\`.`,
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.reply({
        content: `No restriction found for \`/${commandName}\` in <#${channel.id}>.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default command;
