import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { Command, ExtendedClient } from "../../types/index.js";

interface HelpCategory {
  name: string;
  emoji: string;
  commands: { name: string; description: string }[];
}

const CATEGORY_ORDER = ["General", "AI Chat", "Moderation", "Auto-mod & Config", "Server Management", "Utility"];

function getCategory(commandName: string): string {
  const map: Record<string, string> = {
    ping: "General",
    help: "General",
    chat: "AI Chat",
    reset: "AI Chat",
    kick: "Moderation",
    ban: "Moderation",
    unban: "Moderation",
    warn: "Moderation",
    warnings: "Moderation",
    clearwarnings: "Moderation",
    automod: "Auto-mod & Config",
    bannedwords: "Auto-mod & Config",
    warnconfig: "Auto-mod & Config",
    setrole: "Auto-mod & Config",
    removerole: "Auto-mod & Config",
    listroles: "Auto-mod & Config",
    setchannel: "Server Management",
    removechannel: "Server Management",
    listchannels: "Server Management",
    setlogchannel: "Server Management",
    removelogchannel: "Server Management",
    poll: "Utility",
    role: "Utility",
    remind: "Utility",
    reminders: "Utility",
    cancelreminder: "Utility",
    serverinfo: "Utility",
    userinfo: "Utility",
  };
  return map[commandName] ?? "Other";
}

const CATEGORY_EMOJI: Record<string, string> = {
  General: "🏠",
  "AI Chat": "🤖",
  Moderation: "🛡️",
  "Auto-mod & Config": "⚙️",
  "Server Management": "🔧",
  Utility: "🧰",
  Other: "📦",
};

function buildCategories(client: ExtendedClient): HelpCategory[] {
  const grouped = new Map<string, { name: string; description: string }[]>();

  client.commands.forEach((cmd) => {
    const cat = getCategory(cmd.data.name);
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push({
      name: cmd.data.name,
      description: cmd.data.description,
    });
  });

  const categories: HelpCategory[] = [];
  for (const name of CATEGORY_ORDER) {
    const cmds = grouped.get(name);
    if (cmds && cmds.length > 0) {
      categories.push({ name, emoji: CATEGORY_EMOJI[name] ?? "📦", commands: cmds });
    }
  }

  // Add any uncategorized
  for (const [name, cmds] of grouped) {
    if (!CATEGORY_ORDER.includes(name)) {
      categories.push({ name, emoji: "📦", commands: cmds });
    }
  }

  return categories;
}

export function buildHelpEmbed(categories: HelpCategory[], page: number) {
  const cat = categories[page];
  const lines = cat.commands
    .map((cmd) => `\`/${cmd.name}\` — ${cmd.description}`)
    .join("\n");

  return new EmbedBuilder()
    .setTitle(`${cat.emoji} ${cat.name} Commands`)
    .setDescription(lines)
    .setColor(0x5865f2)
    .setFooter({ text: `Page ${page + 1} of ${categories.length}` });
}

export function buildHelpButtons(page: number, totalPages: number) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`help_prev_${page}`)
      .setLabel("◀ Previous")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId(`help_next_${page}`)
      .setLabel("Next ▶")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === totalPages - 1)
  );
}

// Export for button handler
export { buildCategories };

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("List all available commands"),

  async execute(interaction: ChatInputCommandInteraction) {
    const client = interaction.client as ExtendedClient;
    const categories = buildCategories(client);

    const embed = buildHelpEmbed(categories, 0);
    const row = buildHelpButtons(0, categories.length);

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};

export default command;
