import prisma from "./database.js";

// Guild Config

export async function getGuildConfig(guildId: string) {
  return prisma.guildConfig.upsert({
    where: { guildId },
    update: {},
    create: { guildId },
  });
}

export async function updateGuildConfig(
  guildId: string,
  data: Partial<Omit<Parameters<typeof prisma.guildConfig.create>[0]["data"], "guildId">>
) {
  return prisma.guildConfig.upsert({
    where: { guildId },
    update: data,
    create: { guildId, ...data },
  });
}

// Warnings

export async function addWarning(
  guildId: string,
  userId: string,
  moderatorId: string,
  reason: string
): Promise<number> {
  await prisma.warning.create({
    data: { guildId, userId, moderatorId, reason },
  });
  return prisma.warning.count({ where: { guildId, userId } });
}

export async function getWarnings(guildId: string, userId: string) {
  return prisma.warning.findMany({
    where: { guildId, userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function clearWarnings(
  guildId: string,
  userId: string
): Promise<number> {
  const result = await prisma.warning.deleteMany({
    where: { guildId, userId },
  });
  return result.count;
}

export async function countWarnings(
  guildId: string,
  userId: string
): Promise<number> {
  return prisma.warning.count({ where: { guildId, userId } });
}

// Banned Words

export async function addBannedWord(
  guildId: string,
  word: string
): Promise<boolean> {
  try {
    await prisma.bannedWord.create({
      data: { guildId, word: word.toLowerCase() },
    });
    return true;
  } catch {
    // Unique constraint violation — already exists
    return false;
  }
}

export async function removeBannedWord(
  guildId: string,
  word: string
): Promise<boolean> {
  const result = await prisma.bannedWord.deleteMany({
    where: { guildId, word: word.toLowerCase() },
  });
  return result.count > 0;
}

export async function getBannedWords(guildId: string): Promise<string[]> {
  const rows = await prisma.bannedWord.findMany({
    where: { guildId },
    select: { word: true },
  });
  return rows.map((r) => r.word);
}

// Command Roles

export async function addCommandRole(
  guildId: string,
  command: string,
  roleId: string
): Promise<boolean> {
  try {
    await prisma.commandRole.create({
      data: { guildId, command, roleId },
    });
    return true;
  } catch {
    // Unique constraint violation — already exists
    return false;
  }
}

export async function removeCommandRole(
  guildId: string,
  command: string,
  roleId: string
): Promise<boolean> {
  const result = await prisma.commandRole.deleteMany({
    where: { guildId, command, roleId },
  });
  return result.count > 0;
}

export async function getCommandRoles(
  guildId: string,
  command: string
): Promise<string[]> {
  const rows = await prisma.commandRole.findMany({
    where: { guildId, command },
    select: { roleId: true },
  });
  return rows.map((r) => r.roleId);
}
