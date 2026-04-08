import prisma from "./database.js";

export async function getChannelRestrictions(
  guildId: string,
  command: string
): Promise<string[]> {
  const restrictions = await prisma.channelRestriction.findMany({
    where: { guildId, command },
    select: { channelId: true },
  });
  return restrictions.map((r) => r.channelId);
}

export async function addChannelRestriction(
  guildId: string,
  command: string,
  channelId: string
): Promise<boolean> {
  try {
    await prisma.channelRestriction.create({
      data: { guildId, command, channelId },
    });
    return true;
  } catch {
    // Unique constraint violation — already exists
    return false;
  }
}

export async function removeChannelRestriction(
  guildId: string,
  command: string,
  channelId: string
): Promise<boolean> {
  const result = await prisma.channelRestriction.deleteMany({
    where: { guildId, command, channelId },
  });
  return result.count > 0;
}
