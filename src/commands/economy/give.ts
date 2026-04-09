import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types/index.js";
import { transferCoins } from "../../services/economy.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("give")
    .setDescription("Give coins to another user")
    .addUserOption((o) =>
      o.setName("user").setDescription("User to give to").setRequired(true)
    )
    .addIntegerOption((o) =>
      o.setName("amount").setDescription("Amount to give").setRequired(true).setMinValue(1)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser("user", true);
    const amount = interaction.options.getInteger("amount", true);

    if (target.id === interaction.user.id) {
      await interaction.reply({
        content: "You can't give coins to yourself.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const success = await transferCoins(
      interaction.guildId!,
      interaction.user.id,
      target.id,
      amount
    );

    if (success) {
      await interaction.reply(`💸 **${interaction.user.tag}** gave **${amount}** coins to **${target.tag}**.`);
    } else {
      await interaction.reply({
        content: "You don't have enough coins.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default command;
