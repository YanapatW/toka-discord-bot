import {
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import { addCustomQuestion } from "../../services/trivia.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("trivia-add")
    .setDescription("Add a custom trivia question")
    .addStringOption((o) =>
      o.setName("question").setDescription("The question").setRequired(true)
    )
    .addStringOption((o) =>
      o.setName("correct").setDescription("Correct answer").setRequired(true)
    )
    .addStringOption((o) =>
      o.setName("wrong1").setDescription("Wrong answer 1").setRequired(true)
    )
    .addStringOption((o) =>
      o.setName("wrong2").setDescription("Wrong answer 2").setRequired(true)
    )
    .addStringOption((o) =>
      o.setName("wrong3").setDescription("Wrong answer 3").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    const question = interaction.options.getString("question", true);
    const correct = interaction.options.getString("correct", true);
    const wrong = [
      interaction.options.getString("wrong1", true),
      interaction.options.getString("wrong2", true),
      interaction.options.getString("wrong3", true),
    ];

    await addCustomQuestion(
      interaction.guildId!,
      interaction.user.id,
      question,
      correct,
      wrong
    );

    await interaction.reply({
      content: `Trivia question added! Use \`/trivia-custom\` to play.`,
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default command;
