import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Collection, REST, Routes } from "discord.js";
import { config } from "../config.js";
import { Command, ExtendedClient } from "../types/index.js";

export async function loadCommands(client: ExtendedClient): Promise<void> {
  client.commands = new Collection();

  const commandsPath = path.join(__dirname, "..", "commands");
  const commandFolders = fs.readdirSync(commandsPath);

  for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    const stat = fs.statSync(folderPath);
    if (!stat.isDirectory()) continue;

    const commandFiles = fs
      .readdirSync(folderPath)
      .filter((file) => (file.endsWith(".js") || file.endsWith(".ts")) && !file.endsWith(".d.ts"));

    for (const file of commandFiles) {
      const filePath = path.join(folderPath, file);
      const importPath = process.platform === "win32" ? pathToFileURL(filePath).href : filePath;
      const commandModule = await import(importPath);
      const command: Command = commandModule.default ?? commandModule;

      if ("data" in command && "execute" in command) {
        client.commands.set(command.data.name, command);
      } else {
        console.warn(`[WARNING] Command at ${filePath} missing "data" or "execute".`);
      }
    }
  }

  console.log(`Loaded ${client.commands.size} commands.`);
}

export async function registerCommands(client: ExtendedClient): Promise<void> {
  const rest = new REST().setToken(config.discordToken);
  const commandData = client.commands.map((cmd) => cmd.data.toJSON());

  try {
    console.log(`Registering ${commandData.length} slash commands...`);
    await rest.put(Routes.applicationCommands(config.discordClientId), {
      body: commandData,
    });
    console.log("Slash commands registered globally.");
  } catch (error) {
    console.error("Failed to register commands:", error);
  }
}
