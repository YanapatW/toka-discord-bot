import {
  ChatInputCommandInteraction,
  GuildMember,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import {
  addSelfAssignableRole,
  removeSelfAssignableRole,
  getSelfAssignableRoles,
  isSelfAssignable,
} from "../../services/roles.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("role")
    .setDescription("Manage self-assignable roles")
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Assign a role to yourself")
        .addRoleOption((o) =>
          o.setName("role").setDescription("Role to add").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Remove a role from yourself")
        .addRoleOption((o) =>
          o.setName("role").setDescription("Role to remove").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("list").setDescription("List all self-assignable roles")
    )
    .addSubcommand((sub) =>
      sub
        .setName("setup")
        .setDescription("Admin: add a role to the self-assignable list")
        .addRoleOption((o) =>
          o.setName("role").setDescription("Role to allow").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("unsetup")
        .setDescription("Admin: remove a role from the self-assignable list")
        .addRoleOption((o) =>
          o.setName("role").setDescription("Role to remove").setRequired(true)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const member = interaction.member as GuildMember;

    if (sub === "setup" || sub === "unsetup") {
      if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
        await interaction.reply({
          content: "You need Administrator permission to use this.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }

    if (sub === "add") {
      const role = interaction.options.getRole("role", true);

      if (!(await isSelfAssignable(interaction.guildId!, role.id))) {
        await interaction.reply({
          content: `<@&${role.id}> is not a self-assignable role. Use \`/role list\` to see available roles.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      try {
        await member.roles.add(role.id);
        await interaction.reply({
          content: `You now have the <@&${role.id}> role.`,
          flags: MessageFlags.Ephemeral,
        });
      } catch {
        await interaction.reply({
          content: "I can't assign that role. It may be higher than my role.",
          flags: MessageFlags.Ephemeral,
        });
      }
    } else if (sub === "remove") {
      const role = interaction.options.getRole("role", true);

      if (!(await isSelfAssignable(interaction.guildId!, role.id))) {
        await interaction.reply({
          content: `<@&${role.id}> is not a self-assignable role.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      try {
        await member.roles.remove(role.id);
        await interaction.reply({
          content: `Removed <@&${role.id}> from your roles.`,
          flags: MessageFlags.Ephemeral,
        });
      } catch {
        await interaction.reply({
          content: "I can't remove that role. It may be higher than my role.",
          flags: MessageFlags.Ephemeral,
        });
      }
    } else if (sub === "list") {
      const roleIds = await getSelfAssignableRoles(interaction.guildId!);

      await interaction.reply({
        content:
          roleIds.length > 0
            ? `**Self-assignable roles:** ${roleIds.map((id) => `<@&${id}>`).join(", ")}`
            : "No self-assignable roles configured.",
        flags: MessageFlags.Ephemeral,
      });
    } else if (sub === "setup") {
      const role = interaction.options.getRole("role", true);
      const added = await addSelfAssignableRole(interaction.guildId!, role.id);

      await interaction.reply({
        content: added
          ? `<@&${role.id}> is now self-assignable.`
          : `<@&${role.id}> is already self-assignable.`,
        flags: MessageFlags.Ephemeral,
      });
    } else if (sub === "unsetup") {
      const role = interaction.options.getRole("role", true);
      const removed = await removeSelfAssignableRole(interaction.guildId!, role.id);

      await interaction.reply({
        content: removed
          ? `<@&${role.id}> is no longer self-assignable.`
          : `<@&${role.id}> was not in the self-assignable list.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default command;
