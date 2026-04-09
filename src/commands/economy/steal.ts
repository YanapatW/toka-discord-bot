import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types/index.js";
import { attemptSteal } from "../../services/economy.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("steal")
    .setDescription("Attempt to steal coins from another user")
    .addUserOption((o) =>
      o.setName("user").setDescription("User to steal from").setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser("user", true);

    if (target.id === interaction.user.id) {
      await interaction.reply({
        content: "You can't steal from yourself.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const result = await attemptSteal(
      interaction.guildId!,
      interaction.user.id,
      target.id
    );

    if ("onCooldown" in result && result.onCooldown) {
      const timestamp = Math.floor(result.nextSteal.getTime() / 1000);
      await interaction.reply({
        content: `You need to lay low. Try again <t:${timestamp}:R>.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (result.success) {
      await interaction.reply(
        `🦹 You stole **${result.amount}** coins from **${target.tag}**!`
      );
    } else if ("reason" in result && result.reason) {
      await interaction.reply({
        content: result.reason,
        flags: MessageFlags.Ephemeral,
      });
    } else if ("lost" in result) {
      await interaction.reply(
        `👮 You got caught trying to steal from **${target.tag}** and lost **${result.lost}** coins!`
      );
    }
  },
};

export default command;
