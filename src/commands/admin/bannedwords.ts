import {
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import {
  addBannedWord,
  removeBannedWord,
  getBannedWords,
} from "../../services/moderation.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("bannedwords")
    .setDescription("Manage banned words for auto-mod")
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Add a banned word")
        .addStringOption((option) =>
          option.setName("word").setDescription("Word or phrase to ban").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Remove a banned word")
        .addStringOption((option) =>
          option.setName("word").setDescription("Word or phrase to remove").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("list").setDescription("List all banned words")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "add") {
      const word = interaction.options.getString("word", true);
      const added = await addBannedWord(interaction.guildId!, word);

      await interaction.reply({
        content: added
          ? `**${word.toLowerCase()}** has been added to the banned words list.`
          : `**${word.toLowerCase()}** is already banned.`,
        flags: MessageFlags.Ephemeral,
      });
    } else if (sub === "remove") {
      const word = interaction.options.getString("word", true);
      const removed = await removeBannedWord(interaction.guildId!, word);

      await interaction.reply({
        content: removed
          ? `**${word.toLowerCase()}** has been removed from the banned words list.`
          : `**${word.toLowerCase()}** was not in the banned words list.`,
        flags: MessageFlags.Ephemeral,
      });
    } else if (sub === "list") {
      const words = await getBannedWords(interaction.guildId!);

      await interaction.reply({
        content:
          words.length > 0
            ? `**Banned words:** ${words.map((w) => `\`${w}\``).join(", ")}`
            : "No banned words configured.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default command;
