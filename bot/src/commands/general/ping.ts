import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check bot latency"),

  async execute(interaction: ChatInputCommandInteraction) {
    const ws = interaction.client.ws.ping;
    await interaction.reply(`Pong! WebSocket: ${ws}ms`);
  },
};

export default command;
