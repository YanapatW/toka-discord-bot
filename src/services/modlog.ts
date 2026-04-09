import { EmbedBuilder, Guild, TextChannel } from "discord.js";
import { getGuildConfig } from "./moderation.js";

interface ModLogData {
  action: string;
  target: string;
  moderator?: string;
  reason: string;
  color: number;
  extraFields?: { name: string; value: string }[];
}

export async function logModAction(
  guild: Guild,
  type: "moderation" | "automod",
  data: ModLogData
): Promise<void> {
  const config = await getGuildConfig(guild.id);
  const channelId =
    type === "moderation" ? config.modLogChannelId : config.automodLogChannelId;

  if (!channelId) return;

  const channel = guild.channels.cache.get(channelId);
  if (!channel || !(channel instanceof TextChannel)) return;

  const embed = new EmbedBuilder()
    .setTitle(data.action)
    .setColor(data.color)
    .addFields(
      { name: "Target", value: data.target, inline: true },
      { name: "Moderator", value: data.moderator ?? "Auto-mod", inline: true },
      { name: "Reason", value: data.reason }
    )
    .setTimestamp();

  if (data.extraFields) {
    embed.addFields(data.extraFields);
  }

  try {
    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error(`Failed to send mod log to ${channelId}:`, error);
  }
}

export const ModLogColors = {
  BAN: 0xff0000,
  KICK: 0xff8c00,
  WARN: 0xffd700,
  AUTOMOD: 0x3498db,
  INFO: 0x2ecc71,
} as const;
