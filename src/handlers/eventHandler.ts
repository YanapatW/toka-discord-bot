import fs from "node:fs";
import path from "node:path";
import { ExtendedClient, Event } from "../types/index.js";

export async function loadEvents(client: ExtendedClient): Promise<void> {
  const eventsPath = path.join(__dirname, "..", "events");
  const eventFiles = fs
    .readdirSync(eventsPath)
    .filter((file) => (file.endsWith(".js") || file.endsWith(".ts")) && !file.endsWith(".d.ts"));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const eventModule = await import(filePath);
    const event: Event = eventModule.default ?? eventModule;

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
  }

  console.log(`Loaded ${eventFiles.length} events.`);
}
