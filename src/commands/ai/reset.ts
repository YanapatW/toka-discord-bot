import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types/index.js";
import { resetHistory } from "../../services/gemini.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("reset")
    .setDescription("Clear your AI conversation history"),

  async execute(interaction: ChatInputCommandInteraction) {
    const deleted = await resetHistory(
      interaction.user.id,
      interaction.guildId ?? "dm"
    );

    await interaction.reply({
      content:
        deleted > 0
          ? `Cleared ${deleted} messages from your conversation history.`
          : "You have no conversation history to clear.",
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default command;
