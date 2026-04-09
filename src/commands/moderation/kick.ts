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
    .setName("kick")
    .setDescription("Kick a member from the server")
    .addUserOption((option) =>
      option.setName("user").setDescription("Member to kick").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("Reason for kicking")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") ?? "No reason provided";
    const member = await interaction.guild!.members.fetch(user.id).catch(() => null);

    if (!member) {
      await interaction.reply({
        content: "User not found in this server.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!member.kickable) {
      await interaction.reply({
        content: "I cannot kick this user. They may have a higher role than me.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      await member.kick(reason);

      await interaction.reply({
        content: `**${user.tag}** has been kicked. Reason: ${reason}`,
        flags: MessageFlags.Ephemeral,
      });

      await logModAction(interaction.guild!, "moderation", {
        action: "Member Kicked",
        target: `${user.tag} (${user.id})`,
        moderator: interaction.user.tag,
        reason,
        color: ModLogColors.KICK,
      });
    } catch (error) {
      console.error("Kick error:", error);
      await interaction.reply({
        content: "Failed to kick user.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default command;
