import {
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import { removeCommandRole } from "../../services/moderation.js";

const MOD_COMMANDS = ["kick", "ban", "unban", "warn", "warnings", "clearwarnings"];

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("removerole")
    .setDescription("Remove a role's access to a moderation command")
    .addStringOption((option) =>
      option
        .setName("command")
        .setDescription("Command to configure")
        .setRequired(true)
        .addChoices(...MOD_COMMANDS.map((c) => ({ name: `/${c}`, value: c })))
    )
    .addRoleOption((option) =>
      option
        .setName("role")
        .setDescription("Role to remove")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    const commandName = interaction.options.getString("command", true);
    const role = interaction.options.getRole("role", true);

    const removed = await removeCommandRole(interaction.guildId!, commandName, role.id);

    if (removed) {
      await interaction.reply({
        content: `<@&${role.id}> can no longer use \`/${commandName}\`.`,
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.reply({
        content: `<@&${role.id}> didn't have access to \`/${commandName}\`.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default command;
