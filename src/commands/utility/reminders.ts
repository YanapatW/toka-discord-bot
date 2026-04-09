import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import { getUserReminders } from "../../services/reminder.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("reminders")
    .setDescription("List your active reminders"),

  async execute(interaction: ChatInputCommandInteraction) {
    const reminders = await getUserReminders(
      interaction.guildId!,
      interaction.user.id
    );

    if (reminders.length === 0) {
      await interaction.reply({
        content: "You have no active reminders.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("Your Reminders")
      .setColor(0x5865f2);

    for (const r of reminders) {
      const timestamp = Math.floor(r.remindAt.getTime() / 1000);
      embed.addFields({
        name: `#${r.id} — <t:${timestamp}:R>`,
        value: r.message,
      });
    }

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};

export default command;
