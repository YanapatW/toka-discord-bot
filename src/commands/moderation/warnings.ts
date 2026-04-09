import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import { getWarnings } from "../../services/moderation.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("View warnings for a member")
    .addUserOption((option) =>
      option.setName("user").setDescription("Member to check").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser("user", true);
    const warnings = await getWarnings(interaction.guildId!, user.id);

    if (warnings.length === 0) {
      await interaction.reply({
        content: `**${user.tag}** has no warnings.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`Warnings for ${user.tag}`)
      .setColor(0xffd700)
      .setDescription(`Total: **${warnings.length}** warnings`);

    for (const warn of warnings.slice(0, 25)) {
      const mod = await interaction.client.users.fetch(warn.moderatorId).catch(() => null);
      embed.addFields({
        name: `#${warn.id} — ${warn.createdAt.toLocaleDateString()}`,
        value: `**Reason:** ${warn.reason}\n**By:** ${mod?.tag ?? warn.moderatorId}`,
      });
    }

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};

export default command;
