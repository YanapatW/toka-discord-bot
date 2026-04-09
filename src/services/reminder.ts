import prisma from "./database.js";

export async function createReminder(
  guildId: string,
  channelId: string,
  userId: string,
  message: string,
  remindAt: Date
) {
  return prisma.reminder.create({
    data: { guildId, channelId, userId, message, remindAt },
  });
}

export async function getUserReminders(guildId: string, userId: string) {
  return prisma.reminder.findMany({
    where: { guildId, userId, fired: false },
    orderBy: { remindAt: "asc" },
  });
}

export async function cancelReminder(
  id: number,
  userId: string
): Promise<boolean> {
  const result = await prisma.reminder.deleteMany({
    where: { id, userId, fired: false },
  });
  return result.count > 0;
}

export async function getDueReminders() {
  return prisma.reminder.findMany({
    where: { fired: false, remindAt: { lte: new Date() } },
  });
}

export async function markFired(id: number) {
  return prisma.reminder.update({
    where: { id },
    data: { fired: true },
  });
}

export function parseTime(input: string): number | null {
  const match = input.match(/^(\d+)(m|h|d)$/);
  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  const ms = value * multipliers[unit];
  const maxMs = 30 * 24 * 60 * 60 * 1000;

  return ms > 0 && ms <= maxMs ? ms : null;
}
