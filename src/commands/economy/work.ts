import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types/index.js";
import { claimWork } from "../../services/economy.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("work")
    .setDescription("Work to earn coins"),

  async execute(interaction: ChatInputCommandInteraction) {
    const result = await claimWork(interaction.guildId!, interaction.user.id);

    if (result.success) {
      await interaction.reply(`💼 You worked and earned **${result.amount}** coins!`);
    } else {
      const timestamp = Math.floor(result.nextWork.getTime() / 1000);
      await interaction.reply({
        content: `You're tired. You can work again <t:${timestamp}:R>.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default command;
