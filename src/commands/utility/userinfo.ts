import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import { countWarnings } from "../../services/moderation.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Show user information")
    .addUserOption((o) =>
      o.setName("user").setDescription("User to check (defaults to yourself)")
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser("user") ?? interaction.user;
    const member = (await interaction.guild!.members
      .fetch(user.id)
      .catch(() => null)) as GuildMember | null;

    const warnings = await countWarnings(interaction.guildId!, user.id);

    const roles = member
      ? member.roles.cache
          .filter((r) => r.id !== interaction.guildId)
          .sort((a, b) => b.position - a.position)
          .map((r) => `<@&${r.id}>`)
          .slice(0, 20)
          .join(", ") || "None"
      : "N/A";

    const embed = new EmbedBuilder()
      .setTitle(user.tag)
      .setColor(0x5865f2)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        {
          name: "Account Created",
          value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`,
          inline: true,
        },
        {
          name: "Joined Server",
          value: member?.joinedTimestamp
            ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
            : "N/A",
          inline: true,
        },
        { name: "Warnings", value: String(warnings), inline: true },
        { name: "Roles", value: roles }
      );

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
