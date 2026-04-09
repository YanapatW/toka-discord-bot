import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import { fetchRedditMeme } from "../../services/meme.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("meme")
    .setDescription("Get a random meme"),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const meme = await fetchRedditMeme();
    if (!meme) {
      await interaction.editReply("Couldn't fetch a meme right now. Try again later.");
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(meme.title)
      .setImage(meme.url)
      .setColor(0xff4500)
      .setFooter({ text: meme.subreddit });

    await interaction.editReply({ embeds: [embed] });
  },
};

export default command;
