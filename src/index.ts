import { Client, Collection, GatewayIntentBits } from "discord.js";
import { config } from "./config.js";
import { loadCommands, registerCommands } from "./handlers/commandHandler.js";
import { loadEvents } from "./handlers/eventHandler.js";
import { ExtendedClient } from "./types/index.js";
import { getDueReminders, markFired } from "./services/reminder.js";

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

  if (!config.discordToken) {
    console.log("DISCORD_TOKEN not set — running in offline mode (no Discord connection)");
    console.log("Bot is ready but not connected to Discord. Waiting...");
    await new Promise(() => {});
  }

  await registerCommands(client);
  await client.login(config.discordToken);

  // Reminder scheduler — check every 30 seconds
  setInterval(async () => {
    try {
      const due = await getDueReminders();
      for (const reminder of due) {
        try {
          const channel = await client.channels.fetch(reminder.channelId);
          if (channel?.isTextBased() && "send" in channel) {
            await channel.send(
              `<@${reminder.userId}> Reminder: ${reminder.message}`
            );
          }
        } catch (error) {
          console.error(`Reminder ${reminder.id} failed:`, error);
        }
        await markFired(reminder.id);
      }
    } catch (error) {
      console.error("Reminder scheduler error:", error);
    }
  }, 30_000);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
