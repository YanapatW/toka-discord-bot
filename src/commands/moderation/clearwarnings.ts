import {
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import { clearWarnings } from "../../services/moderation.js";
import { logModAction, ModLogColors } from "../../services/modlog.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("clearwarnings")
    .setDescription("Clear all warnings for a member")
    .addUserOption((option) =>
      option.setName("user").setDescription("Member to clear").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser("user", true);
    const count = await clearWarnings(interaction.guildId!, user.id);

    await interaction.reply({
      content:
        count > 0
          ? `Cleared **${count}** warnings for **${user.tag}**.`
          : `**${user.tag}** has no warnings to clear.`,
      flags: MessageFlags.Ephemeral,
    });

    if (count > 0) {
      await logModAction(interaction.guild!, "moderation", {
        action: "Warnings Cleared",
        target: `${user.tag} (${user.id})`,
        moderator: interaction.user.tag,
        reason: `${count} warnings cleared`,
        color: ModLogColors.INFO,
      });
    }
  },
};

export default command;
