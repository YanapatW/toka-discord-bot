import prisma from "./database.js";

export async function addSelfAssignableRole(
  guildId: string,
  roleId: string
): Promise<boolean> {
  try {
    await prisma.selfAssignableRole.create({ data: { guildId, roleId } });
    return true;
  } catch {
    return false;
  }
}

export async function removeSelfAssignableRole(
  guildId: string,
  roleId: string
): Promise<boolean> {
  const result = await prisma.selfAssignableRole.deleteMany({
    where: { guildId, roleId },
  });
  return result.count > 0;
}

export async function getSelfAssignableRoles(guildId: string): Promise<string[]> {
  const roles = await prisma.selfAssignableRole.findMany({
    where: { guildId },
    select: { roleId: true },
  });
  return roles.map((r) => r.roleId);
}

export async function isSelfAssignable(
  guildId: string,
  roleId: string
): Promise<boolean> {
  const count = await prisma.selfAssignableRole.count({
    where: { guildId, roleId },
  });
  return count > 0;
}
