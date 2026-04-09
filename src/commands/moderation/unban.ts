import {
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import { logModAction, ModLogColors } from "../../services/modlog.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unban a user from the server")
    .addStringOption((option) =>
      option
        .setName("user-id")
        .setDescription("User ID to unban")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("Reason for unbanning")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction: ChatInputCommandInteraction) {
    const userId = interaction.options.getString("user-id", true);
    const reason = interaction.options.getString("reason") ?? "No reason provided";

    try {
      const user = await interaction.client.users.fetch(userId);
      await interaction.guild!.members.unban(userId, reason);

      await interaction.reply({
        content: `**${user.tag}** has been unbanned. Reason: ${reason}`,
        flags: MessageFlags.Ephemeral,
      });

      await logModAction(interaction.guild!, "moderation", {
        action: "Member Unbanned",
        target: `${user.tag} (${user.id})`,
        moderator: interaction.user.tag,
        reason,
        color: ModLogColors.INFO,
      });
    } catch (error) {
      console.error("Unban error:", error);
      await interaction.reply({
        content: "Failed to unban user. Make sure the ID is correct and the user is banned.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default command;
