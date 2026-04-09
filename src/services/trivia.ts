import prisma from "./database.js";

interface TriviaQuestionData {
  question: string;
  correctAnswer: string;
  wrongAnswers: string[];
}

export async function fetchTriviaQuestion(): Promise<TriviaQuestionData> {
  const res = await fetch(
    "https://opentdb.com/api.php?amount=1&type=multiple&encode=url3986"
  );
  const data = (await res.json()) as {
    results: { question: string; correct_answer: string; incorrect_answers: string[] }[];
  };
  const q = data.results[0];

  return {
    question: decodeURIComponent(q.question),
    correctAnswer: decodeURIComponent(q.correct_answer),
    wrongAnswers: q.incorrect_answers.map((a: string) => decodeURIComponent(a)),
  };
}

export async function addCustomQuestion(
  guildId: string,
  creatorId: string,
  question: string,
  correctAnswer: string,
  wrongAnswers: string[]
) {
  return prisma.triviaQuestion.create({
    data: {
      guildId,
      creatorId,
      question,
      correctAnswer,
      wrongAnswers: JSON.stringify(wrongAnswers),
    },
  });
}

export async function getRandomCustomQuestion(
  guildId: string
): Promise<TriviaQuestionData | null> {
  const count = await prisma.triviaQuestion.count({ where: { guildId } });
  if (count === 0) return null;

  const skip = Math.floor(Math.random() * count);
  const questions = await prisma.triviaQuestion.findMany({
    where: { guildId },
    skip,
    take: 1,
  });

  if (questions.length === 0) return null;

  const q = questions[0];
  return {
    question: q.question,
    correctAnswer: q.correctAnswer,
    wrongAnswers: JSON.parse(q.wrongAnswers),
  };
}
