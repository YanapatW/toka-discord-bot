import { Client, Collection, GatewayIntentBits } from "discord.js";
import { config } from "./config.js";
import { loadCommands, registerCommands } from "./handlers/commandHandler.js";
import { loadEvents } from "./handlers/eventHandler.js";
import { ExtendedClient } from "./types/index.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
}) as ExtendedClient;

client.commands = new Collection();
client.cooldowns = new Collection();

async function main(): Promise<void> {
  await loadCommands(client);
  await loadEvents(client);
  await registerCommands(client);
  await client.login(config.discordToken);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
