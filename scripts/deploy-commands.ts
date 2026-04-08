import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { REST, Routes } from "discord.js";
import { Command } from "../src/types/index.js";

const token = process.env.DISCORD_TOKEN!;
const clientId = process.env.DISCORD_CLIENT_ID!;

const commands: object[] = [];
const commandsPath = path.join(__dirname, "..", "src", "commands");
const commandFolders = fs.readdirSync(commandsPath);

async function main() {
  for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    const stat = fs.statSync(folderPath);
    if (!stat.isDirectory()) continue;

    const commandFiles = fs
      .readdirSync(folderPath)
      .filter((file) => file.endsWith(".ts"));

    for (const file of commandFiles) {
      const filePath = path.join(folderPath, file);
      const commandModule = await import(filePath);
      const command: Command = commandModule.default ?? commandModule;

      if ("data" in command) {
        commands.push(command.data.toJSON());
      }
    }
  }

  const rest = new REST().setToken(token);

  console.log(`Registering ${commands.length} slash commands...`);
  await rest.put(Routes.applicationCommands(clientId), { body: commands });
  console.log("Done!");
}

main().catch(console.error);
