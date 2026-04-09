import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("Show server information"),

  async execute(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild!;
    const owner = await guild.fetchOwner();

    const embed = new EmbedBuilder()
      .setTitle(guild.name)
      .setColor(0x5865f2)
      .setThumbnail(guild.iconURL({ size: 256 }))
      .addFields(
        { name: "Owner", value: owner.user.tag, inline: true },
        { name: "Members", value: String(guild.memberCount), inline: true },
        {
          name: "Created",
          value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`,
          inline: true,
        },
        {
          name: "Boost Level",
          value: `Level ${guild.premiumTier} (${guild.premiumSubscriptionCount ?? 0} boosts)`,
          inline: true,
        }
      );

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
