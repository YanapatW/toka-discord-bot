import prisma from "./database.js";

export async function createItem(
  guildId: string,
  name: string,
  description: string,
  price: number,
  roleId?: string
) {
  return prisma.shopItem.create({
    data: { guildId, name, description, price, roleId: roleId ?? null },
  });
}

export async function deleteItem(guildId: string, name: string): Promise<boolean> {
  const result = await prisma.shopItem.deleteMany({
    where: { guildId, name },
  });
  return result.count > 0;
}

export async function getItems(guildId: string) {
  return prisma.shopItem.findMany({ where: { guildId }, orderBy: { price: "asc" } });
}

export async function buyItem(guildId: string, userId: string, itemName: string) {
  const item = await prisma.shopItem.findFirst({ where: { guildId, name: itemName } });
  if (!item) return { success: false as const, reason: "Item not found" };

  const user = await prisma.userEconomy.upsert({
    where: { guildId_userId: { guildId, userId } },
    create: { guildId, userId },
    update: {},
  });

  if (user.balance < item.price) {
    return { success: false as const, reason: "Not enough coins" };
  }

  await prisma.$transaction([
    prisma.userEconomy.update({
      where: { guildId_userId: { guildId, userId } },
      data: { balance: { decrement: item.price } },
    }),
    prisma.userInventory.create({
      data: { guildId, userId, itemId: item.id },
    }),
  ]);

  return { success: true as const, item };
}

export async function getInventory(guildId: string, userId: string) {
  const items = await prisma.userInventory.findMany({
    where: { guildId, userId },
  });

  const itemIds = items.map((i) => i.itemId);
  return prisma.shopItem.findMany({
    where: { id: { in: itemIds } },
  });
}
