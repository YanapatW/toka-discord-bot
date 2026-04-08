import {
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import { addChannelRestriction } from "../../services/settings.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("setchannel")
    .setDescription("Restrict a command to a specific channel")
    .addStringOption((option) =>
      option
        .setName("command")
        .setDescription("Command name to restrict")
        .setRequired(true)
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Channel to allow the command in")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    const commandName = interaction.options.getString("command", true);
    const channel = interaction.options.getChannel("channel", true);

    const added = await addChannelRestriction(
      interaction.guildId!,
      commandName,
      channel.id
    );

    if (added) {
      await interaction.reply({
        content: `\`/${commandName}\` is now restricted to <#${channel.id}>.`,
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.reply({
        content: `\`/${commandName}\` is already allowed in <#${channel.id}>.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default command;
