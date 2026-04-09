import {
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import { updateGuildConfig } from "../../services/moderation.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("setlogchannel")
    .setDescription("Set the log channel for a category")
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("Log category")
        .setRequired(true)
        .addChoices(
          { name: "moderation", value: "moderation" },
          { name: "automod", value: "automod" }
        )
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Channel to send logs to")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    const type = interaction.options.getString("type", true);
    const channel = interaction.options.getChannel("channel", true);
    const field =
      type === "moderation" ? "modLogChannelId" : "automodLogChannelId";

    await updateGuildConfig(interaction.guildId!, { [field]: channel.id });

    await interaction.reply({
      content: `${type} logs will now be sent to <#${channel.id}>.`,
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default command;
