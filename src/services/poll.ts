import prisma from "./database.js";

export async function createPoll(
  guildId: string,
  channelId: string,
  messageId: string,
  creatorId: string,
  question: string,
  options: string[]
) {
  return prisma.poll.create({
    data: {
      guildId,
      channelId,
      messageId,
      creatorId,
      question,
      options: {
        create: options.map((label, i) => ({ label, position: i })),
      },
    },
    include: { options: true },
  });
}

export async function vote(pollId: number, userId: string, optionId: number) {
  return prisma.pollVote.upsert({
    where: { pollId_userId: { pollId, userId } },
    create: { pollId, userId, optionId },
    update: { optionId },
  });
}

export async function getPollResults(pollId: number) {
  return prisma.poll.findUnique({
    where: { id: pollId },
    include: {
      options: {
        orderBy: { position: "asc" },
        include: { _count: { select: { votes: true } } },
      },
      _count: { select: { votes: true } },
    },
  });
}

export async function getPollByMessageId(messageId: string) {
  return prisma.poll.findFirst({
    where: { messageId },
    include: {
      options: {
        orderBy: { position: "asc" },
        include: { _count: { select: { votes: true } } },
      },
      _count: { select: { votes: true } },
    },
  });
}

export async function endPoll(pollId: number) {
  return prisma.poll.update({
    where: { id: pollId },
    data: { active: false },
  });
}
