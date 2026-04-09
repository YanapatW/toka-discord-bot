import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import { getInventory } from "../../services/shop.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("inventory")
    .setDescription("View your purchased items"),

  async execute(interaction: ChatInputCommandInteraction) {
    const items = await getInventory(interaction.guildId!, interaction.user.id);

    if (items.length === 0) {
      await interaction.reply({
        content: "Your inventory is empty.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`🎒 ${interaction.user.tag}'s Inventory`)
      .setColor(0x5865f2)
      .setDescription(items.map((i) => `• **${i.name}** — ${i.description}`).join("\n"));

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};

export default command;
