import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types/index.js";
import { claimDaily } from "../../services/economy.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Claim your daily coins"),

  async execute(interaction: ChatInputCommandInteraction) {
    const result = await claimDaily(interaction.guildId!, interaction.user.id);

    if (result.success) {
      await interaction.reply(`💰 You claimed **${result.amount}** daily coins!`);
    } else {
      const timestamp = Math.floor(result.nextClaim.getTime() / 1000);
      await interaction.reply({
        content: `You already claimed today. Next daily <t:${timestamp}:R>.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default command;
