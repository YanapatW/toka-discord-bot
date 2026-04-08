import {
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import { getChannelRestrictions } from "../../services/settings.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("listchannels")
    .setDescription("Show channel restrictions for a command")
    .addStringOption((option) =>
      option
        .setName("command")
        .setDescription("Command name")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    const commandName = interaction.options.getString("command", true);

    const channels = await getChannelRestrictions(
      interaction.guildId!,
      commandName
    );

    if (channels.length === 0) {
      await interaction.reply({
        content: `\`/${commandName}\` has no channel restrictions (works everywhere).`,
        flags: MessageFlags.Ephemeral,
      });
    } else {
      const list = channels.map((id) => `<#${id}>`).join(", ");
      await interaction.reply({
        content: `\`/${commandName}\` is restricted to: ${list}`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default command;
