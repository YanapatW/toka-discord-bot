import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import { getCommandRoles } from "../../services/moderation.js";

const MOD_COMMANDS = ["kick", "ban", "unban", "warn", "warnings", "clearwarnings"];

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("listroles")
    .setDescription("Show role overrides for moderation commands")
    .addStringOption((option) =>
      option
        .setName("command")
        .setDescription("Command to check (leave empty for all)")
        .addChoices(...MOD_COMMANDS.map((c) => ({ name: `/${c}`, value: c })))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    const commandName = interaction.options.getString("command");
    const commands = commandName ? [commandName] : MOD_COMMANDS;

    const embed = new EmbedBuilder()
      .setTitle("Role Overrides")
      .setColor(0x3498db);

    for (const cmd of commands) {
      const roleIds = await getCommandRoles(interaction.guildId!, cmd);
      const value =
        roleIds.length > 0
          ? roleIds.map((id) => `<@&${id}>`).join(", ")
          : "Default (Discord permissions)";
      embed.addFields({ name: `/${cmd}`, value });
    }

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};

export default command;
