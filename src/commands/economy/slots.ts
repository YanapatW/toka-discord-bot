import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types/index.js";
import { getBalance, addCoins, removeCoins } from "../../services/economy.js";

const SYMBOLS = ["🍒", "🍋", "🍊", "🍇", "💎", "7️⃣"];

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("slots")
    .setDescription("Play the slot machine")
    .addIntegerOption((o) =>
      o.setName("bet").setDescription("Amount to bet").setRequired(true).setMinValue(1)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const bet = interaction.options.getInteger("bet", true);
    const balance = await getBalance(interaction.guildId!, interaction.user.id);

    if (balance < bet) {
      await interaction.reply({
        content: `You only have **${balance}** coins.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const s1 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const s2 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const s3 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];

    let multiplier = 0;
    let result: string;

    if (s1 === s2 && s2 === s3) {
      multiplier = 10;
      result = "JACKPOT!";
    } else if (s1 === s2 || s2 === s3 || s1 === s3) {
      multiplier = 2;
      result = "Two match!";
    } else {
      multiplier = 0;
      result = "No match...";
    }

    const winnings = bet * multiplier;
    if (multiplier > 0) {
      await addCoins(interaction.guildId!, interaction.user.id, winnings - bet);
    } else {
      await removeCoins(interaction.guildId!, interaction.user.id, bet);
    }

    const net = winnings - bet;
    const sign = net >= 0 ? "+" : "";

    await interaction.reply(
      `🎰 | ${s1} | ${s2} | ${s3} |\n\n**${result}** ${sign}${net} coins (bet: ${bet})`
    );
  },
};

export default command;
