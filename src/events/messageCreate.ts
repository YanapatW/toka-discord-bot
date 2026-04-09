import { Events, Message, PermissionFlagsBits } from "discord.js";
import { Event } from "../types/index.js";
import { chat } from "../services/gemini.js";
import { getGuildConfig, getBannedWords, addWarning } from "../services/moderation.js";
import { logModAction, ModLogColors } from "../services/modlog.js";

// Spam tracking: guildId:userId -> message timestamps
const spamMap = new Map<string, number[]>();

const event: Event = {
  name: Events.MessageCreate,
  async execute(message: Message) {
    if (message.author.bot) return;

    // Auto-mod checks (guild only, skip admins)
    if (message.guildId && message.member) {
      const isAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator);

      if (!isAdmin) {
        const triggered = await runAutomod(message);
        if (triggered) return;
      }
    }

    // @mention AI chat (existing logic)
    const isMentioned = message.mentions.has(message.client.user!);
    const isReplyToBot =
      message.reference &&
      (await message.channel.messages.fetch(message.reference.messageId!).catch(() => null))
        ?.author?.id === message.client.user!.id;

    if (!isMentioned && !isReplyToBot) return;

    const content = message.content
      .replace(new RegExp(`<@!?${message.client.user!.id}>`, "g"), "")
      .trim();

    if (!content) return;

    try {
      if ("sendTyping" in message.channel) {
        await message.channel.sendTyping();
      }

      const reply = await chat(
        message.author.id,
        message.guildId ?? "dm",
        content
      );

      const response = reply.length > 2000 ? reply.substring(0, 1997) + "..." : reply;
      await message.reply(response);
    } catch (error) {
      console.error("Gemini error:", error);
      await message.reply("AI is temporarily unavailable, please try again later.");
    }
  },
};

async function runAutomod(message: Message): Promise<boolean> {
  let config;
  try {
    config = await getGuildConfig(message.guildId!);
  } catch (error) {
    console.error("Auto-mod config error:", error);
    return false;
  }

  // 1. Banned words
  if (config.automodBannedWords) {
    const words = await getBannedWords(message.guildId!);
    const lower = message.content.toLowerCase();
    const found = words.find((w) => lower.includes(w));
    if (found) {
      await handleAutomod(message, config, `Banned word: ${found}`);
      return true;
    }
  }

  // 2. Spam detection
  if (config.automodSpam) {
    const key = `${message.guildId}:${message.author.id}`;
    const now = Date.now();
    const timestamps = spamMap.get(key) ?? [];
    const cutoff = now - config.spamInterval * 1000;
    const recent = timestamps.filter((t) => t > cutoff);
    recent.push(now);
    spamMap.set(key, recent);

    if (recent.length > config.spamMaxMessages) {
      spamMap.set(key, []);
      await handleAutomod(message, config, "Spam detected");
      return true;
    }
  }

  // 3. Link filter
  if (config.automodLinks) {
    if (/https?:\/\/\S+/i.test(message.content)) {
      await handleAutomod(message, config, "Links are not allowed");
      return true;
    }
  }

  // 4. Mass mentions
  if (config.automodMassMentions) {
    if (message.mentions.users.size >= config.massMentionLimit) {
      await handleAutomod(message, config, "Too many mentions");
      return true;
    }
  }

  return false;
}

async function handleAutomod(
  message: Message,
  config: Awaited<ReturnType<typeof getGuildConfig>>,
  reason: string
) {
  // Delete the message
  try {
    await message.delete();
  } catch {
    // Message may already be deleted
  }

  // Send temporary notice
  try {
    if (!("send" in message.channel)) return;
    const notice = await message.channel.send(
      `<@${message.author.id}> [Auto-mod] Your message was removed: ${reason}`
    );
    setTimeout(() => notice.delete().catch(() => {}), 5000);
  } catch {
    // Channel may not be accessible
  }

  // Log to automod channel
  try {
    await logModAction(message.guild!, "automod", {
      action: `Auto-mod: ${reason}`,
      target: `${message.author.tag} (${message.author.id})`,
      reason,
      color: ModLogColors.AUTOMOD,
    });
  } catch (error) {
    console.error("Auto-mod log error:", error);
  }

  // Auto-warn if escalation is configured
  if (config.warnMuteThreshold || config.warnKickThreshold || config.warnBanThreshold) {
    try {
      const count = await addWarning(
        message.guildId!,
        message.author.id,
        message.client.user!.id,
        `[Auto-mod] ${reason}`
      );

      const member = message.member!;

      if (config.warnBanThreshold && count >= config.warnBanThreshold && member.bannable) {
        await member.ban({ reason: `Auto-escalation: ${count} warnings` });
        await logModAction(message.guild!, "moderation", {
          action: "Auto-Ban",
          target: `${message.author.tag} (${message.author.id})`,
          moderator: "Auto-escalation",
          reason: `Reached ${count} warnings`,
          color: ModLogColors.BAN,
        });
      } else if (config.warnKickThreshold && count >= config.warnKickThreshold && member.kickable) {
        await member.kick(`Auto-escalation: ${count} warnings`);
        await logModAction(message.guild!, "moderation", {
          action: "Auto-Kick",
          target: `${message.author.tag} (${message.author.id})`,
          moderator: "Auto-escalation",
          reason: `Reached ${count} warnings`,
          color: ModLogColors.KICK,
        });
      } else if (config.warnMuteThreshold && count >= config.warnMuteThreshold) {
        const duration = config.muteDuration * 60 * 1000;
        await member.timeout(duration, `Auto-escalation: ${count} warnings`);
        await logModAction(message.guild!, "moderation", {
          action: `Auto-Mute (${config.muteDuration}min)`,
          target: `${message.author.tag} (${message.author.id})`,
          moderator: "Auto-escalation",
          reason: `Reached ${count} warnings`,
          color: ModLogColors.WARN,
        });
      }
    } catch (error) {
      console.error("Auto-mod escalation error:", error);
    }
  }
}

export default event;
