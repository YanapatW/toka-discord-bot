import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types/index.js";
import { getLeaderboard } from "../../services/economy.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Show the richest users"),

  async execute(interaction: ChatInputCommandInteraction) {
    const top = await getLeaderboard(interaction.guildId!);

    if (top.length === 0) {
      await interaction.reply("No one has any coins yet!");
      return;
    }

    const lines = await Promise.all(
      top.map(async (entry, i) => {
        const user = await interaction.client.users.fetch(entry.userId).catch(() => null);
        const name = user?.tag ?? entry.userId;
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
        return `${medal} **${name}** — ${entry.balance} coins`;
      })
    );

    const embed = new EmbedBuilder()
      .setTitle("💰 Leaderboard")
      .setDescription(lines.join("\n"))
      .setColor(0xffd700);

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
