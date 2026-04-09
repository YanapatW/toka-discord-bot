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
    .setName("ban")
    .setDescription("Ban a member from the server")
    .addUserOption((option) =>
      option.setName("user").setDescription("Member to ban").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("Reason for banning")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") ?? "No reason provided";
    const member = await interaction.guild!.members.fetch(user.id).catch(() => null);

    if (member && !member.bannable) {
      await interaction.reply({
        content: "I cannot ban this user. They may have a higher role than me.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      await interaction.guild!.members.ban(user.id, { reason });

      await interaction.reply({
        content: `**${user.tag}** has been banned. Reason: ${reason}`,
        flags: MessageFlags.Ephemeral,
      });

      await logModAction(interaction.guild!, "moderation", {
        action: "Member Banned",
        target: `${user.tag} (${user.id})`,
        moderator: interaction.user.tag,
        reason,
        color: ModLogColors.BAN,
      });
    } catch (error) {
      console.error("Ban error:", error);
      await interaction.reply({
        content: "Failed to ban user.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default command;
