import { GoogleGenAI, Content } from "@google/genai";
import { config } from "../config.js";
import prisma from "./database.js";

const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

const SYSTEM_PROMPT =
  "You are ToKa, a helpful and friendly Discord bot assistant. Keep responses concise and under 2000 characters (Discord message limit).";

const MAX_HISTORY = 20;

export async function chat(
  userId: string,
  guildId: string,
  message: string
): Promise<string> {
  // Fetch conversation history from DB
  const history = await prisma.conversationHistory.findMany({
    where: { userId, guildId },
    orderBy: { createdAt: "asc" },
  });

  // Build contents array for Gemini
  const contents: Content[] = history.map((h) => ({
    role: h.role as "user" | "model",
    parts: [{ text: h.content }],
  }));

  // Add current message
  contents.push({
    role: "user",
    parts: [{ text: message }],
  });

  // Call Gemini
  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents,
    config: {
      systemInstruction: SYSTEM_PROMPT,
    },
  });

  const reply = response.text ?? "I couldn't generate a response.";

  // Save user message + model response to DB
  await prisma.conversationHistory.createMany({
    data: [
      { userId, guildId, role: "user", content: message },
      { userId, guildId, role: "model", content: reply },
    ],
  });

  // Enforce history cap — delete oldest messages beyond limit
  const totalMessages = await prisma.conversationHistory.count({
    where: { userId, guildId },
  });

  if (totalMessages > MAX_HISTORY) {
    const excess = totalMessages - MAX_HISTORY;
    const oldestMessages = await prisma.conversationHistory.findMany({
      where: { userId, guildId },
      orderBy: { createdAt: "asc" },
      take: excess,
      select: { id: true },
    });

    await prisma.conversationHistory.deleteMany({
      where: { id: { in: oldestMessages.map((m) => m.id) } },
    });
  }

  return reply;
}

export async function resetHistory(
  userId: string,
  guildId: string
): Promise<number> {
  const result = await prisma.conversationHistory.deleteMany({
    where: { userId, guildId },
  });
  return result.count;
}
