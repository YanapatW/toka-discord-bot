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
import { getBalance, addCoins, removeCoins } from "../../services/economy.js";

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function drawCard(): string {
  return RANKS[Math.floor(Math.random() * 13)] + SUITS[Math.floor(Math.random() * 4)];
}

function handValue(hand: string[]): number {
  let total = 0;
  let aces = 0;

  for (const card of hand) {
    const rank = card.slice(0, -1);
    if (rank === "A") {
      aces++;
      total += 11;
    } else if (["J", "Q", "K"].includes(rank)) {
      total += 10;
    } else {
      total += parseInt(rank, 10);
    }
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  return total;
}

function formatHand(hand: string[], hideSecond = false): string {
  if (hideSecond) return `${hand[0]} ??`;
  return hand.join(" ");
}

function buildBJEmbed(
  playerHand: string[],
  dealerHand: string[],
  bet: number,
  hideDealer: boolean,
  result?: string
) {
  const playerVal = handValue(playerHand);
  const dealerVal = hideDealer ? "?" : handValue(dealerHand);

  const embed = new EmbedBuilder()
    .setTitle("Blackjack")
    .setColor(result ? (result.includes("win") || result.includes("Blackjack") ? 0x2ecc71 : result.includes("Tie") ? 0xffd700 : 0xff0000) : 0x5865f2)
    .addFields(
      { name: `Your Hand (${playerVal})`, value: formatHand(playerHand), inline: true },
      { name: `Dealer (${dealerVal})`, value: formatHand(dealerHand, hideDealer), inline: true }
    )
    .setFooter({ text: result ?? `Bet: ${bet} coins` });

  return embed;
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("blackjack")
    .setDescription("Play blackjack")
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

    const playerHand = [drawCard(), drawCard()];
    const dealerHand = [drawCard(), drawCard()];

    // Check natural blackjack
    if (handValue(playerHand) === 21) {
      const winnings = Math.floor(bet * 2.5);
      await addCoins(interaction.guildId!, interaction.user.id, winnings - bet);
      const embed = buildBJEmbed(playerHand, dealerHand, bet, false, `Blackjack! +${winnings - bet} coins`);
      await interaction.reply({ embeds: [embed] });
      return;
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("bj_hit").setLabel("Hit").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("bj_stand").setLabel("Stand").setStyle(ButtonStyle.Secondary)
    );

    const embed = buildBJEmbed(playerHand, dealerHand, bet, true);
    const reply = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (i) => i.user.id === interaction.user.id,
      time: 60_000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "bj_hit") {
        playerHand.push(drawCard());

        if (handValue(playerHand) > 21) {
          collector.stop("bust");
          await removeCoins(interaction.guildId!, interaction.user.id, bet);
          const bustEmbed = buildBJEmbed(playerHand, dealerHand, bet, false, `Bust! -${bet} coins`);
          const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId("bj_hit").setLabel("Hit").setStyle(ButtonStyle.Primary).setDisabled(true),
            new ButtonBuilder().setCustomId("bj_stand").setLabel("Stand").setStyle(ButtonStyle.Secondary).setDisabled(true)
          );
          await i.update({ embeds: [bustEmbed], components: [disabledRow] });
          return;
        }

        const hitEmbed = buildBJEmbed(playerHand, dealerHand, bet, true);
        await i.update({ embeds: [hitEmbed], components: [row] });
      } else if (i.customId === "bj_stand") {
        collector.stop("stand");

        // Dealer draws
        while (handValue(dealerHand) < 17) {
          dealerHand.push(drawCard());
        }

        const playerVal = handValue(playerHand);
        const dealerVal = handValue(dealerHand);
        let result: string;

        if (dealerVal > 21 || playerVal > dealerVal) {
          await addCoins(interaction.guildId!, interaction.user.id, bet);
          result = `You win! +${bet} coins`;
        } else if (playerVal < dealerVal) {
          await removeCoins(interaction.guildId!, interaction.user.id, bet);
          result = `Dealer wins. -${bet} coins`;
        } else {
          result = "Tie! Bet returned.";
        }

        const finalEmbed = buildBJEmbed(playerHand, dealerHand, bet, false, result);
        const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId("bj_hit").setLabel("Hit").setStyle(ButtonStyle.Primary).setDisabled(true),
          new ButtonBuilder().setCustomId("bj_stand").setLabel("Stand").setStyle(ButtonStyle.Secondary).setDisabled(true)
        );
        await i.update({ embeds: [finalEmbed], components: [disabledRow] });
      }
    });

    collector.on("end", async (_, reason) => {
      if (reason === "time") {
        await removeCoins(interaction.guildId!, interaction.user.id, bet);
        const timeoutEmbed = buildBJEmbed(playerHand, dealerHand, bet, false, `Time's up! -${bet} coins`);
        const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId("bj_hit").setLabel("Hit").setStyle(ButtonStyle.Primary).setDisabled(true),
          new ButtonBuilder().setCustomId("bj_stand").setLabel("Stand").setStyle(ButtonStyle.Secondary).setDisabled(true)
        );
        await interaction.editReply({ embeds: [timeoutEmbed], components: [disabledRow] });
      }
    });
  },
};

export default command;
