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
    .setName("removelogchannel")
    .setDescription("Disable logging for a category")
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
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    const type = interaction.options.getString("type", true);
    const field =
      type === "moderation" ? "modLogChannelId" : "automodLogChannelId";

    await updateGuildConfig(interaction.guildId!, { [field]: null });

    await interaction.reply({
      content: `${type} logging has been disabled.`,
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default command;
