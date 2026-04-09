import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string): string {
  return process.env[name] || "";
}

export const config = {
  discordToken: optional("DISCORD_TOKEN"),
  discordClientId: optional("DISCORD_CLIENT_ID"),
  geminiApiKey: optional("GEMINI_API_KEY"),
  databaseUrl: required("DATABASE_URL"),
};
