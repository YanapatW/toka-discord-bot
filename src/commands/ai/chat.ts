import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types/index.js";
import { chat } from "../../services/gemini.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("chat")
    .setDescription("Talk to ToKa AI")
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("Your message")
        .setRequired(true)
    ),

  cooldown: 5,

  async execute(interaction: ChatInputCommandInteraction) {
    const message = interaction.options.getString("message", true);

    await interaction.deferReply();

    try {
      const reply = await chat(
        interaction.user.id,
        interaction.guildId ?? "dm",
        message
      );

      // Discord message limit is 2000 chars
      if (reply.length > 2000) {
        await interaction.editReply(reply.substring(0, 1997) + "...");
      } else {
        await interaction.editReply(reply);
      }
    } catch (error) {
      console.error("Gemini error:", error);
      await interaction.editReply(
        "AI is temporarily unavailable, please try again later."
      );
    }
  },
};

export default command;
