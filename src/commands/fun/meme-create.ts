import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import { generateMeme } from "../../services/meme.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("meme-create")
    .setDescription("Generate a meme from a template")
    .addStringOption((o) =>
      o.setName("template").setDescription("Template ID (e.g. 181913649 for Drake)").setRequired(true)
    )
    .addStringOption((o) =>
      o.setName("top").setDescription("Top text").setRequired(true)
    )
    .addStringOption((o) =>
      o.setName("bottom").setDescription("Bottom text").setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!process.env.IMGFLIP_USERNAME || !process.env.IMGFLIP_PASSWORD) {
      await interaction.reply({
        content: "Meme generator not configured. Ask an admin to set IMGFLIP_USERNAME and IMGFLIP_PASSWORD.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply();

    const template = interaction.options.getString("template", true);
    const top = interaction.options.getString("top", true);
    const bottom = interaction.options.getString("bottom", true);

    const url = await generateMeme(template, top, bottom);
    if (!url) {
      await interaction.editReply("Failed to generate meme. Check the template ID.");
      return;
    }

    const embed = new EmbedBuilder()
      .setImage(url)
      .setColor(0xff4500);

    await interaction.editReply({ embeds: [embed] });
  },
};

export default command;
