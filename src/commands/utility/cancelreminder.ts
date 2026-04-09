import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import { cancelReminder } from "../../services/reminder.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("cancelreminder")
    .setDescription("Cancel a reminder")
    .addIntegerOption((o) =>
      o
        .setName("id")
        .setDescription("Reminder ID (from /reminders)")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const id = interaction.options.getInteger("id", true);
    const cancelled = await cancelReminder(id, interaction.user.id);

    await interaction.reply({
      content: cancelled
        ? `Reminder #${id} cancelled.`
        : `Reminder #${id} not found or not yours.`,
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default command;
