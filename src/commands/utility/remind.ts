import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import { createReminder, parseTime } from "../../services/reminder.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("remind")
    .setDescription("Set a reminder")
    .addStringOption((o) =>
      o
        .setName("time")
        .setDescription("When to remind (e.g. 30m, 2h, 1d)")
        .setRequired(true)
    )
    .addStringOption((o) =>
      o
        .setName("message")
        .setDescription("What to remind you about")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const timeStr = interaction.options.getString("time", true);
    const message = interaction.options.getString("message", true);

    const ms = parseTime(timeStr);
    if (!ms) {
      await interaction.reply({
        content: "Invalid time format. Use `30m`, `2h`, or `1d` (max 30d).",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const remindAt = new Date(Date.now() + ms);

    await createReminder(
      interaction.guildId!,
      interaction.channelId,
      interaction.user.id,
      message,
      remindAt
    );

    const timestamp = Math.floor(remindAt.getTime() / 1000);

    await interaction.reply({
      content: `Reminder set! I'll ping you <t:${timestamp}:R> — "${message}"`,
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default command;
