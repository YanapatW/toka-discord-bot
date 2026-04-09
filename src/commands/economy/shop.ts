import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import { createItem, deleteItem, getItems, buyItem } from "../../services/shop.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("shop")
    .setDescription("Server shop")
    .addSubcommand((sub) =>
      sub.setName("list").setDescription("View all shop items")
    )
    .addSubcommand((sub) =>
      sub
        .setName("buy")
        .setDescription("Buy an item")
        .addStringOption((o) =>
          o.setName("item").setDescription("Item name").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("create")
        .setDescription("Admin: create a shop item")
        .addStringOption((o) =>
          o.setName("name").setDescription("Item name").setRequired(true)
        )
        .addIntegerOption((o) =>
          o.setName("price").setDescription("Price in coins").setRequired(true).setMinValue(1)
        )
        .addStringOption((o) =>
          o.setName("description").setDescription("Item description").setRequired(true)
        )
        .addRoleOption((o) =>
          o.setName("role").setDescription("Role to grant on purchase (optional)")
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("delete")
        .setDescription("Admin: delete a shop item")
        .addStringOption((o) =>
          o.setName("name").setDescription("Item name").setRequired(true)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const member = interaction.member as GuildMember;

    if (sub === "create" || sub === "delete") {
      if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
        await interaction.reply({
          content: "You need Administrator permission.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }

    if (sub === "list") {
      const items = await getItems(interaction.guildId!);

      if (items.length === 0) {
        await interaction.reply({
          content: "The shop is empty.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle("🛒 Shop")
        .setColor(0x5865f2);

      for (const item of items) {
        const roleNote = item.roleId ? ` (grants <@&${item.roleId}>)` : "";
        embed.addFields({
          name: `${item.name} — ${item.price} coins`,
          value: `${item.description}${roleNote}`,
        });
      }

      await interaction.reply({ embeds: [embed] });
    } else if (sub === "buy") {
      const itemName = interaction.options.getString("item", true);
      const result = await buyItem(interaction.guildId!, interaction.user.id, itemName);

      if (!result.success) {
        await interaction.reply({
          content: result.reason,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      let roleMsg = "";
      if (result.item.roleId) {
        try {
          await member.roles.add(result.item.roleId);
          roleMsg = ` You received the <@&${result.item.roleId}> role!`;
        } catch {
          roleMsg = " (Failed to grant role — bot may lack permissions.)";
        }
      }

      await interaction.reply(
        `🛒 You bought **${result.item.name}** for **${result.item.price}** coins!${roleMsg}`
      );
    } else if (sub === "create") {
      const name = interaction.options.getString("name", true);
      const price = interaction.options.getInteger("price", true);
      const description = interaction.options.getString("description", true);
      const role = interaction.options.getRole("role");

      await createItem(interaction.guildId!, name, description, price, role?.id);

      await interaction.reply({
        content: `Created shop item **${name}** for **${price}** coins.`,
        flags: MessageFlags.Ephemeral,
      });
    } else if (sub === "delete") {
      const name = interaction.options.getString("name", true);
      const deleted = await deleteItem(interaction.guildId!, name);

      await interaction.reply({
        content: deleted
          ? `Deleted **${name}** from the shop.`
          : `Item **${name}** not found.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default command;
