import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import { getRandomCustomQuestion } from "../../services/trivia.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("trivia-custom")
    .setDescription("Answer a custom trivia question from this server"),

  async execute(interaction: ChatInputCommandInteraction) {
    const q = await getRandomCustomQuestion(interaction.guildId!);
    if (!q) {
      await interaction.reply({
        content: "No custom trivia questions for this server. Admins can add them with `/trivia-add`.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const answers = [...q.wrongAnswers, q.correctAnswer].sort(() => Math.random() - 0.5);
    const correctIndex = answers.indexOf(q.correctAnswer);

    const embed = new EmbedBuilder()
      .setTitle("Custom Trivia")
      .setDescription(q.question)
      .setColor(0x5865f2)
      .addFields(
        answers.map((a, i) => ({ name: `${i + 1}`, value: a, inline: true }))
      )
      .setFooter({ text: "You have 15 seconds to answer!" });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      answers.map((_, i) =>
        new ButtonBuilder()
          .setCustomId(`tcustom_${i}`)
          .setLabel(`${i + 1}`)
          .setStyle(ButtonStyle.Primary)
      )
    );

    const reply = await interaction.reply({
      embeds: [embed],
      components: [row],
      fetchReply: true,
    });

    try {
      const click = await reply.awaitMessageComponent({
        componentType: ComponentType.Button,
        filter: (i) => i.user.id === interaction.user.id,
        time: 15_000,
      });

      const chosen = parseInt(click.customId.split("_")[1], 10);
      const correct = chosen === correctIndex;

      const resultEmbed = EmbedBuilder.from(embed)
        .setColor(correct ? 0x2ecc71 : 0xff0000)
        .setFooter({ text: correct ? "Correct!" : `Wrong! The answer was: ${q.correctAnswer}` });

      const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        answers.map((_, i) =>
          new ButtonBuilder()
            .setCustomId(`tcustom_${i}`)
            .setLabel(`${i + 1}`)
            .setStyle(i === correctIndex ? ButtonStyle.Success : i === chosen ? ButtonStyle.Danger : ButtonStyle.Secondary)
            .setDisabled(true)
        )
      );

      await click.update({ embeds: [resultEmbed], components: [disabledRow] });
    } catch {
      const timeoutEmbed = EmbedBuilder.from(embed)
        .setColor(0xff8c00)
        .setFooter({ text: `Time's up! The answer was: ${q.correctAnswer}` });

      const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        answers.map((_, i) =>
          new ButtonBuilder()
            .setCustomId(`tcustom_${i}`)
            .setLabel(`${i + 1}`)
            .setStyle(i === correctIndex ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(true)
        )
      );

      await interaction.editReply({ embeds: [timeoutEmbed], components: [disabledRow] });
    }
  },
};

export default command;
