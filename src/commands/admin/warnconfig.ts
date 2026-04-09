import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import { getGuildConfig, updateGuildConfig } from "../../services/moderation.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("warnconfig")
    .setDescription("Configure warn escalation thresholds")
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Set a warn threshold for an action")
        .addStringOption((option) =>
          option
            .setName("action")
            .setDescription("Action to trigger")
            .setRequired(true)
            .addChoices(
              { name: "mute", value: "mute" },
              { name: "kick", value: "kick" },
              { name: "ban", value: "ban" }
            )
        )
        .addIntegerOption((option) =>
          option
            .setName("threshold")
            .setDescription("Number of warnings to trigger (0 to disable)")
            .setRequired(true)
            .setMinValue(0)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("status").setDescription("Show current warn thresholds")
    )
    .addSubcommand((sub) =>
      sub
        .setName("mute-duration")
        .setDescription("Set auto-mute duration")
        .addIntegerOption((option) =>
          option
            .setName("minutes")
            .setDescription("Duration in minutes")
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "set") {
      const action = interaction.options.getString("action", true);
      const threshold = interaction.options.getInteger("threshold", true);
      const fieldMap: Record<string, string> = {
        mute: "warnMuteThreshold",
        kick: "warnKickThreshold",
        ban: "warnBanThreshold",
      };

      const value = threshold === 0 ? null : threshold;
      await updateGuildConfig(interaction.guildId!, { [fieldMap[action]]: value });

      await interaction.reply({
        content:
          value !== null
            ? `Auto-**${action}** will trigger at **${threshold}** warnings.`
            : `Auto-**${action}** has been disabled.`,
        flags: MessageFlags.Ephemeral,
      });
    } else if (sub === "status") {
      const config = await getGuildConfig(interaction.guildId!);
      const embed = new EmbedBuilder()
        .setTitle("Warn Escalation Config")
        .setColor(0xffd700)
        .addFields(
          { name: "Mute at", value: config.warnMuteThreshold?.toString() ?? "Disabled", inline: true },
          { name: "Kick at", value: config.warnKickThreshold?.toString() ?? "Disabled", inline: true },
          { name: "Ban at", value: config.warnBanThreshold?.toString() ?? "Disabled", inline: true },
          { name: "Mute Duration", value: `${config.muteDuration} minutes` }
        );

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    } else if (sub === "mute-duration") {
      const minutes = interaction.options.getInteger("minutes", true);
      await updateGuildConfig(interaction.guildId!, { muteDuration: minutes });

      await interaction.reply({
        content: `Auto-mute duration set to **${minutes}** minutes.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default command;
