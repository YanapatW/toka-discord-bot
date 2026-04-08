import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Command, ExtendedClient } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("List all available commands"),

  async execute(interaction: ChatInputCommandInteraction) {
    const client = interaction.client as ExtendedClient;

    const embed = new EmbedBuilder()
      .setTitle("ToKa — Commands")
      .setColor(0x5865f2)
      .setDescription(
        client.commands
          .map((cmd) => `\`/${cmd.data.name}\` — ${cmd.data.description}`)
          .join("\n")
      );

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
