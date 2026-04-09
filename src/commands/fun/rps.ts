import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types/index.js";

const choices = ["rock", "paper", "scissors"] as const;
const emoji: Record<string, string> = { rock: "🪨", paper: "📄", scissors: "✂️" };

function getResult(player: string, bot: string): string {
  if (player === bot) return "It's a **tie**!";
  const wins: Record<string, string> = { rock: "scissors", paper: "rock", scissors: "paper" };
  return wins[player] === bot ? "You **win**!" : "You **lose**!";
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("rps")
    .setDescription("Rock, paper, scissors")
    .addStringOption((o) =>
      o
        .setName("choice")
        .setDescription("Your choice")
        .setRequired(true)
        .addChoices(
          { name: "Rock", value: "rock" },
          { name: "Paper", value: "paper" },
          { name: "Scissors", value: "scissors" }
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const player = interaction.options.getString("choice", true);
    const bot = choices[Math.floor(Math.random() * 3)];
    const result = getResult(player, bot);

    await interaction.reply(
      `${emoji[player]} vs ${emoji[bot]}\n${result}`
    );
  },
};

export default command;
