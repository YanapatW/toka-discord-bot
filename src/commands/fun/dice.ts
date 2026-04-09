import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("dice")
    .setDescription("Roll a dice")
    .addIntegerOption((o) =>
      o
        .setName("sides")
        .setDescription("Number of sides (default 6)")
        .setMinValue(2)
        .setMaxValue(100)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sides = interaction.options.getInteger("sides") ?? 6;
    const result = Math.floor(Math.random() * sides) + 1;
    await interaction.reply(`🎲 You rolled a **${result}** (d${sides})`);
  },
};

export default command;
