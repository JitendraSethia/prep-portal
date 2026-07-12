import { GoogleGenAI } from "@google/genai";

// Google Gemini has a free tier via Google AI Studio (aistudio.google.com/apikey).
// `gemini-flash-latest` tracks the current free-tier flash model and returns
// text directly (unlike 2.5-flash's "thinking" budget quirks).
export const AI_MODEL = process.env.GEMINI_MODEL ?? "gemini-flash-latest";

export function isAIConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
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

const SYSTEM_PROMPT =
  "You are an expert tutor for Indian competitive exams (NEET, JEE, CUET, CTET). " +
  "Explain the solution to a single multiple-choice/numerical question clearly and concisely. " +
  "Use short, numbered steps. State the key concept or formula, work through it, and end with the final answer. " +
  "Keep it under ~180 words. Do not invent facts; if the provided correct answer seems off, explain the correct reasoning anyway.";

function buildUserPrompt(input: ExplainInput): string {
  const optionsBlock = input.options.length
    ? input.options.map((o) => `${o.key}. ${o.text}`).join("\n")
    : "(numerical answer)";

  return `Exam: ${input.examName}
Subject: ${input.subject}${input.topic ? ` › ${input.topic}` : ""}

Question:
${input.stem}

Options:
${optionsBlock}

Correct answer: ${input.correctText}
${input.authorSolution ? `\nReference solution (may be terse): ${input.authorSolution}` : ""}

Give a step-by-step explanation of why this is correct.`;
}

/**
 * Stream an explanation as an async iterable of text chunks.
 * Throws if the API call fails; caller decides on fallback.
 */
export async function* streamExplanation(
  input: ExplainInput
): AsyncGenerator<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const stream = await ai.models.generateContentStream({
    model: AI_MODEL,
    contents: buildUserPrompt(input),
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.3,
      maxOutputTokens: 800,
    },
  });

  for await (const chunk of stream) {
    const text = chunk.text;
    if (text) yield text;
  }
}

/** Fallback text when AI is not configured or the call fails. */
export function fallbackExplanation(input: ExplainInput): string {
  if (input.authorSolution) {
    return `**Solution.** ${input.authorSolution}\n\n_(AI explanations are disabled — showing the reference solution. Set GEMINI_API_KEY to enable AI.)_`;
  }
  return `The correct answer is **${input.correctText}**.\n\n_(AI explanations are not configured. Set GEMINI_API_KEY to generate step-by-step solutions.)_`;
}
