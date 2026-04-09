import prisma from "./database.js";

export async function getBalance(guildId: string, userId: string) {
  const user = await prisma.userEconomy.upsert({
    where: { guildId_userId: { guildId, userId } },
    create: { guildId, userId },
    update: {},
  });
  return user.balance;
}

export async function addCoins(guildId: string, userId: string, amount: number) {
  await prisma.userEconomy.upsert({
    where: { guildId_userId: { guildId, userId } },
    create: { guildId, userId, balance: amount },
    update: { balance: { increment: amount } },
  });
}

export async function removeCoins(
  guildId: string,
  userId: string,
  amount: number
): Promise<boolean> {
  const user = await prisma.userEconomy.upsert({
    where: { guildId_userId: { guildId, userId } },
    create: { guildId, userId },
    update: {},
  });
  if (user.balance < amount) return false;
  await prisma.userEconomy.update({
    where: { guildId_userId: { guildId, userId } },
    data: { balance: { decrement: amount } },
  });
  return true;
}

export async function transferCoins(
  guildId: string,
  fromUserId: string,
  toUserId: string,
  amount: number
): Promise<boolean> {
  const sender = await prisma.userEconomy.upsert({
    where: { guildId_userId: { guildId, userId: fromUserId } },
    create: { guildId, userId: fromUserId },
    update: {},
  });
  if (sender.balance < amount) return false;

  await prisma.$transaction([
    prisma.userEconomy.update({
      where: { guildId_userId: { guildId, userId: fromUserId } },
      data: { balance: { decrement: amount } },
    }),
    prisma.userEconomy.upsert({
      where: { guildId_userId: { guildId, userId: toUserId } },
      create: { guildId, userId: toUserId, balance: amount },
      update: { balance: { increment: amount } },
    }),
  ]);
  return true;
}

export async function getLeaderboard(guildId: string, limit = 10) {
  return prisma.userEconomy.findMany({
    where: { guildId },
    orderBy: { balance: "desc" },
    take: limit,
  });
}

export async function claimDaily(guildId: string, userId: string) {
  const user = await prisma.userEconomy.upsert({
    where: { guildId_userId: { guildId, userId } },
    create: { guildId, userId },
    update: {},
  });

  const now = new Date();
  const cooldown = 24 * 60 * 60 * 1000;

  if (user.lastDaily && now.getTime() - user.lastDaily.getTime() < cooldown) {
    const nextClaim = new Date(user.lastDaily.getTime() + cooldown);
    return { success: false as const, nextClaim };
  }

  await prisma.userEconomy.update({
    where: { guildId_userId: { guildId, userId } },
    data: { balance: { increment: 100 }, lastDaily: now },
  });

  return { success: true as const, amount: 100 };
}

export async function claimWork(guildId: string, userId: string) {
  const user = await prisma.userEconomy.upsert({
    where: { guildId_userId: { guildId, userId } },
    create: { guildId, userId },
    update: {},
  });

  const now = new Date();
  const cooldown = 60 * 60 * 1000;

  if (user.lastWork && now.getTime() - user.lastWork.getTime() < cooldown) {
    const nextWork = new Date(user.lastWork.getTime() + cooldown);
    return { success: false as const, nextWork };
  }

  const amount = Math.floor(Math.random() * 41) + 10;

  await prisma.userEconomy.update({
    where: { guildId_userId: { guildId, userId } },
    data: { balance: { increment: amount }, lastWork: now },
  });

  return { success: true as const, amount };
}

export async function attemptSteal(
  guildId: string,
  userId: string,
  targetId: string
) {
  const user = await prisma.userEconomy.upsert({
    where: { guildId_userId: { guildId, userId } },
    create: { guildId, userId },
    update: {},
  });

  const now = new Date();
  const cooldown = 2 * 60 * 60 * 1000;

  if (user.lastSteal && now.getTime() - user.lastSteal.getTime() < cooldown) {
    const nextSteal = new Date(user.lastSteal.getTime() + cooldown);
    return { success: false as const, onCooldown: true as const, nextSteal };
  }

  const target = await prisma.userEconomy.upsert({
    where: { guildId_userId: { guildId, userId: targetId } },
    create: { guildId, userId: targetId },
    update: {},
  });

  await prisma.userEconomy.update({
    where: { guildId_userId: { guildId, userId } },
    data: { lastSteal: now },
  });

  const succeeded = Math.random() < 0.4;

  if (succeeded) {
    const pct = 0.1 + Math.random() * 0.2;
    const stolen = Math.max(1, Math.floor(target.balance * pct));
    if (target.balance < 1) {
      return { success: false as const, onCooldown: false as const, reason: "Target has no coins" };
    }
    await prisma.$transaction([
      prisma.userEconomy.update({
        where: { guildId_userId: { guildId, userId: targetId } },
        data: { balance: { decrement: stolen } },
      }),
      prisma.userEconomy.update({
        where: { guildId_userId: { guildId, userId } },
        data: { balance: { increment: stolen } },
      }),
    ]);
    return { success: true as const, amount: stolen };
  } else {
    const lost = Math.max(1, Math.floor(user.balance * 0.1));
    if (user.balance > 0) {
      await prisma.userEconomy.update({
        where: { guildId_userId: { guildId, userId } },
        data: { balance: { decrement: lost } },
      });
    }
    return { success: false as const, onCooldown: false as const, lost };
  }
}
