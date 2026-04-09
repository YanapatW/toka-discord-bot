import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import { getGuildConfig, updateGuildConfig } from "../../services/moderation.js";

const FEATURE_MAP: Record<string, string> = {
  "banned-words": "automodBannedWords",
  spam: "automodSpam",
  links: "automodLinks",
  "mass-mentions": "automodMassMentions",
};

const SETTING_MAP: Record<string, string> = {
  "spam-max-messages": "spamMaxMessages",
  "spam-interval": "spamInterval",
  "mass-mention-limit": "massMentionLimit",
};

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("automod")
    .setDescription("Configure auto-moderation")
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Toggle an auto-mod feature")
        .addStringOption((option) =>
          option
            .setName("feature")
            .setDescription("Feature to toggle")
            .setRequired(true)
            .addChoices(
              { name: "banned-words", value: "banned-words" },
              { name: "spam", value: "spam" },
              { name: "links", value: "links" },
              { name: "mass-mentions", value: "mass-mentions" }
            )
        )
        .addBooleanOption((option) =>
          option.setName("enabled").setDescription("Enable or disable").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("config")
        .setDescription("Set an auto-mod threshold")
        .addStringOption((option) =>
          option
            .setName("setting")
            .setDescription("Setting to change")
            .setRequired(true)
            .addChoices(
              { name: "spam-max-messages", value: "spam-max-messages" },
              { name: "spam-interval", value: "spam-interval" },
              { name: "mass-mention-limit", value: "mass-mention-limit" }
            )
        )
        .addIntegerOption((option) =>
          option
            .setName("value")
            .setDescription("New value")
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("status").setDescription("Show auto-mod status")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "set") {
      const feature = interaction.options.getString("feature", true);
      const enabled = interaction.options.getBoolean("enabled", true);
      const field = FEATURE_MAP[feature];

      await updateGuildConfig(interaction.guildId!, { [field]: enabled });

      await interaction.reply({
        content: `Auto-mod **${feature}** has been ${enabled ? "enabled" : "disabled"}.`,
        flags: MessageFlags.Ephemeral,
      });
    } else if (sub === "config") {
      const setting = interaction.options.getString("setting", true);
      const value = interaction.options.getInteger("value", true);
      const field = SETTING_MAP[setting];

      await updateGuildConfig(interaction.guildId!, { [field]: value });

      await interaction.reply({
        content: `**${setting}** set to **${value}**.`,
        flags: MessageFlags.Ephemeral,
      });
    } else if (sub === "status") {
      const config = await getGuildConfig(interaction.guildId!);

      const embed = new EmbedBuilder()
        .setTitle("Auto-mod Status")
        .setColor(0x3498db)
        .addFields(
          { name: "Banned Words", value: config.automodBannedWords ? "On" : "Off", inline: true },
          { name: "Spam Detection", value: config.automodSpam ? "On" : "Off", inline: true },
          { name: "Link Filter", value: config.automodLinks ? "On" : "Off", inline: true },
          { name: "Mass Mentions", value: config.automodMassMentions ? "On" : "Off", inline: true },
          { name: "Spam Max Messages", value: String(config.spamMaxMessages), inline: true },
          { name: "Spam Interval", value: `${config.spamInterval}s`, inline: true },
          { name: "Mass Mention Limit", value: String(config.massMentionLimit), inline: true }
        );

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  },
};

export default command;
