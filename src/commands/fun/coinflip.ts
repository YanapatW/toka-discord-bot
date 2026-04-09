import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("Flip a coin"),

  async execute(interaction: ChatInputCommandInteraction) {
    const result = Math.random() < 0.5 ? "Heads" : "Tails";
    await interaction.reply(`🪙 **${result}!**`);
  },
};

export default command;
