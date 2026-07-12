import OpenAI from "openai";

export const AI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

export function isAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export interface ExplainInput {
  examName: string;
  subject: string;
  topic?: string | null;
  stem: string;
  options: { key: string; text: string }[];
  correctText: string; // human-readable correct answer
  authorSolution?: string | null;
}

function buildMessages(input: ExplainInput): OpenAI.Chat.ChatCompletionMessageParam[] {
  const optionsBlock = input.options.length
    ? input.options.map((o) => `${o.key}. ${o.text}`).join("\n")
    : "(numerical answer)";

  const system =
    "You are an expert tutor for Indian competitive exams (NEET, JEE, CUET, CTET). " +
    "Explain the solution to a single multiple-choice/numerical question clearly and concisely. " +
    "Use short, numbered steps. State the key concept or formula, work through it, and end with the final answer. " +
    "Keep it under ~180 words. Do not invent facts; if the provided correct answer seems off, explain the correct reasoning anyway.";

  const user = `Exam: ${input.examName}
Subject: ${input.subject}${input.topic ? ` › ${input.topic}` : ""}

Question:
${input.stem}

Options:
${optionsBlock}

Correct answer: ${input.correctText}
${input.authorSolution ? `\nReference solution (may be terse): ${input.authorSolution}` : ""}

Give a step-by-step explanation of why this is correct.`;

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

/**
 * Stream an explanation as an async iterable of text chunks.
 * Throws if the API call fails; caller decides on fallback.
 */
export async function* streamExplanation(
  input: ExplainInput
): AsyncGenerator<string> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const stream = await client.chat.completions.create({
    model: AI_MODEL,
    messages: buildMessages(input),
    temperature: 0.3,
    max_tokens: 400,
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}

/** Fallback text when AI is not configured or the call fails. */
export function fallbackExplanation(input: ExplainInput): string {
  if (input.authorSolution) {
    return `**Solution.** ${input.authorSolution}\n\n_(AI explanations are disabled — showing the reference solution. Set OPENAI_API_KEY to enable AI.)_`;
  }
  return `The correct answer is **${input.correctText}**.\n\n_(AI explanations are not configured. Set OPENAI_API_KEY to generate step-by-step solutions.)_`;
}
