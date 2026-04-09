import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import { createPoll } from "../../services/poll.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("poll")
    .setDescription("Create a poll with button voting")
    .addStringOption((o) =>
      o.setName("question").setDescription("Poll question").setRequired(true)
    )
    .addStringOption((o) =>
      o.setName("option1").setDescription("Option 1").setRequired(true)
    )
    .addStringOption((o) =>
      o.setName("option2").setDescription("Option 2").setRequired(true)
    )
    .addStringOption((o) => o.setName("option3").setDescription("Option 3"))
    .addStringOption((o) => o.setName("option4").setDescription("Option 4"))
    .addStringOption((o) => o.setName("option5").setDescription("Option 5"))
    .addStringOption((o) => o.setName("option6").setDescription("Option 6"))
    .addStringOption((o) => o.setName("option7").setDescription("Option 7"))
    .addStringOption((o) => o.setName("option8").setDescription("Option 8"))
    .addStringOption((o) => o.setName("option9").setDescription("Option 9"))
    .addStringOption((o) => o.setName("option10").setDescription("Option 10")),

  async execute(interaction: ChatInputCommandInteraction) {
    const question = interaction.options.getString("question", true);
    const options: string[] = [];

    for (let i = 1; i <= 10; i++) {
      const opt = interaction.options.getString(`option${i}`);
      if (opt) options.push(opt);
    }

    const embed = buildPollEmbed(question, options, new Map(), 0);
    const rows = buildPollButtons(0, options, true);

    const reply = await interaction.reply({
      embeds: [embed],
      components: rows,
      fetchReply: true,
    });

    await createPoll(
      interaction.guildId!,
      interaction.channelId,
      reply.id,
      interaction.user.id,
      question,
      options
    );
  },
};

export function buildPollEmbed(
  question: string,
  optionLabels: string[],
  voteCounts: Map<number, number>,
  totalVotes: number
) {
  const lines = optionLabels.map((label, i) => {
    const count = voteCounts.get(i) ?? 0;
    const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
    const bar =
      "\u2588".repeat(Math.round(pct / 10)) +
      "\u2591".repeat(10 - Math.round(pct / 10));
    return `**${i + 1}.** ${label}\n${bar} ${count} votes (${pct}%)`;
  });

  return new EmbedBuilder()
    .setTitle(question)
    .setDescription(lines.join("\n\n"))
    .setColor(0x5865f2)
    .setFooter({ text: `${totalVotes} total votes` });
}

export function buildPollButtons(
  pollId: number,
  optionLabels: string[],
  active: boolean
) {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];

  for (let i = 0; i < optionLabels.length; i += 5) {
    const row = new ActionRowBuilder<ButtonBuilder>();
    const chunk = optionLabels.slice(i, i + 5);
    chunk.forEach((label, j) => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`poll_vote_${pollId}_${i + j}`)
          .setLabel(label.length > 80 ? label.substring(0, 77) + "..." : label)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(!active)
      );
    });
    rows.push(row);
  }

  const endRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`poll_end_${pollId}`)
      .setLabel("End Poll")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(!active)
  );
  rows.push(endRow);

  return rows;
}

export default command;
