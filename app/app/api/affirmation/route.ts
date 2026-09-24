import { env } from "cloudflare:workers";

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

const GENERAL_MESSAGES = [
  "The outlook is bright—start with one small step and let momentum meet you there.",
  "Yes, with patience. You are closer than the doubt in your head wants you to believe.",
  "The signs point toward progress, especially if you give yourself room to begin imperfectly.",
  "Trust the next kind, practical step. You do not need the whole path at once.",
  "A good possibility is opening up—bring your effort, keep your expectations gentle, and see what grows.",
];

function hashQuestion(question: string) {
  return [...question].reduce((total, character) => total + character.charCodeAt(0), 0);
}

function builtInAnswer(question: string) {
  const normalized = question.toLowerCase();

  if (/hurt myself|kill myself|suicide|don['’]t want to live/.test(normalized)) {
    return "You deserve real support right now—please reach out to someone you trust or a crisis service where you are.";
  }
  if (/stress|overwhelm|anxious|panic|too much/.test(normalized)) {
    return "You do not have to solve everything at once—choose the smallest kind next step and breathe before the next one.";
  }
  if (/exam|test|class|school|study|grade/.test(normalized)) {
    return "You are more prepared than your nerves suggest—one focused study block can move this forward today.";
  }
  if (/job|interview|career|work|project/.test(normalized)) {
    return "The outlook favors steady effort—show what you know, stay curious, and let the next opportunity meet you halfway.";
  }
  if (/friend|love|relationship|date/.test(normalized)) {
    return "Lead with honesty and warmth; the right connection will make room for the real you.";
  }

  return GENERAL_MESSAGES[hashQuestion(question) % GENERAL_MESSAGES.length];
}

function extractText(response: OpenAIResponse) {
  if (response.output_text?.trim()) return response.output_text.trim();

  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text?.trim()) {
        return content.text.trim();
      }
    }
  }
  return "";
}

export async function POST(request: Request) {
  let question = "";
  try {
    const body = (await request.json()) as { question?: unknown };
    question = typeof body.question === "string" ? body.question.trim().slice(0, 240) : "";
  } catch {
    return Response.json({ error: "Send a question as JSON." }, { status: 400 });
  }

  if (!question) {
    return Response.json({ error: "Ask Saturn a question first." }, { status: 400 });
  }

  if (!env.OPENAI_API_KEY) {
    return Response.json({ message: builtInAnswer(question), source: "built-in" });
  }

  try {
    const apiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL || "gpt-5",
        store: false,
        max_output_tokens: 80,
        instructions:
          "You are Saturn, a kind positive Magic 8 Ball inside a day-planning and stress-reset app. Reply with exactly one supportive sentence of no more than 22 words. Be encouraging but honest, never promise an outcome, and suggest a gentle next step when useful. Do not diagnose or give medical, legal, or financial advice.",
        input: question,
      }),
    });

    if (!apiResponse.ok) throw new Error("OpenAI request failed");
    const data = (await apiResponse.json()) as OpenAIResponse;
    const message = extractText(data);
    if (!message) throw new Error("OpenAI returned no text");

    return Response.json({ message, source: "ai" });
  } catch {
    return Response.json({ message: builtInAnswer(question), source: "built-in" });
  }
}
