import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types/index.js";
import { getBalance } from "../../services/economy.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Check coin balance")
    .addUserOption((o) =>
      o.setName("user").setDescription("User to check (defaults to yourself)")
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser("user") ?? interaction.user;
    const balance = await getBalance(interaction.guildId!, user.id);
    await interaction.reply(`💰 **${user.tag}** has **${balance}** coins.`);
  },
};

export default command;
