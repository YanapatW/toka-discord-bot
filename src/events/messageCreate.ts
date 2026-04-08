import { Events, Message } from "discord.js";
import { Event } from "../types/index.js";
import { chat } from "../services/gemini.js";

const event: Event = {
  name: Events.MessageCreate,
  async execute(message: Message) {
    // Ignore bot messages
    if (message.author.bot) return;

    // Only respond when the bot is mentioned or in reply to the bot
    const isMentioned = message.mentions.has(message.client.user!);
    const isReplyToBot =
      message.reference &&
      (await message.channel.messages.fetch(message.reference.messageId!).catch(() => null))
        ?.author?.id === message.client.user!.id;

    if (!isMentioned && !isReplyToBot) return;

    // Remove the bot mention from the message
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

      // Discord message limit
      const response = reply.length > 2000 ? reply.substring(0, 1997) + "..." : reply;

      await message.reply(response);
    } catch (error) {
      console.error("Gemini error:", error);
      await message.reply("AI is temporarily unavailable, please try again later.");
    }
  },
};

export default event;
