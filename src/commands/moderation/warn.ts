import {
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import { addWarning, getGuildConfig } from "../../services/moderation.js";
import { logModAction, ModLogColors } from "../../services/modlog.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a member")
    .addUserOption((option) =>
      option.setName("user").setDescription("Member to warn").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("Reason for warning")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") ?? "No reason provided";

    const count = await addWarning(
      interaction.guildId!,
      user.id,
      interaction.user.id,
      reason
    );

    await interaction.reply({
      content: `**${user.tag}** has been warned. Reason: ${reason} (Total warnings: ${count})`,
      flags: MessageFlags.Ephemeral,
    });

    await logModAction(interaction.guild!, "moderation", {
      action: "Member Warned",
      target: `${user.tag} (${user.id})`,
      moderator: interaction.user.tag,
      reason,
      color: ModLogColors.WARN,
      extraFields: [{ name: "Total Warnings", value: String(count) }],
    });

    // Escalation check
    const config = await getGuildConfig(interaction.guildId!);
    const member = await interaction.guild!.members.fetch(user.id).catch(() => null);
    if (!member) return;

    let escalationAction: string | null = null;

    if (config.warnBanThreshold && count >= config.warnBanThreshold && member.bannable) {
      await member.ban({ reason: `Auto-escalation: ${count} warnings` });
      escalationAction = "Auto-Ban";
    } else if (config.warnKickThreshold && count >= config.warnKickThreshold && member.kickable) {
      await member.kick(`Auto-escalation: ${count} warnings`);
      escalationAction = "Auto-Kick";
    } else if (config.warnMuteThreshold && count >= config.warnMuteThreshold) {
      const duration = config.muteDuration * 60 * 1000;
      await member.timeout(duration, `Auto-escalation: ${count} warnings`);
      escalationAction = `Auto-Mute (${config.muteDuration}min)`;
    }

    if (escalationAction) {
      await interaction.followUp({
        content: `**${user.tag}** has been auto-escalated: **${escalationAction}** (${count} warnings)`,
        flags: MessageFlags.Ephemeral,
      });

      const color = escalationAction.includes("Ban")
        ? ModLogColors.BAN
        : escalationAction.includes("Kick")
          ? ModLogColors.KICK
          : ModLogColors.WARN;

      await logModAction(interaction.guild!, "moderation", {
        action: escalationAction,
        target: `${user.tag} (${user.id})`,
        moderator: "Auto-escalation",
        reason: `Reached ${count} warnings`,
        color,
      });
    }
  },
};

export default command;
