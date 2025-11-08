// src/app/api/interviewer/route.ts
import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;

type ChatMessage = {
  from: "interviewer" | "candidate";
  text: string;
};

export async function POST(req: NextRequest) {
  if (!OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: "Missing OPENROUTER_API_KEY on server" },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const {
    problem,
    history,
    userMessage,
    role = "newgrad",
    company = "generic"
  }: {
    problem?: any;
    history?: ChatMessage[];
    userMessage?: string;
    role?: string;
    company?: string;
  } = body;

  if (!problem || !problem.title || !problem.prompt) {
    return NextResponse.json(
      { error: "Missing or invalid 'problem' in request body" },
      { status: 400 }
    );
  }

  if (!userMessage || typeof userMessage !== "string") {
    return NextResponse.json(
      { error: "Missing 'userMessage' in request body" },
      { status: 400 }
    );
  }

  const safeHistory = Array.isArray(history) ? history.slice(-10) : [];

  const systemPrompt = `
You are a strict but fair senior software engineer acting as a live coding interviewer.
Guidelines:
- Talk as the INTERVIEWER only (never as the candidate).
- Style: concise, technical, professional, not cheesy.
- Use the given problem as the source of truth.
- Ask targeted follow-up questions.
- If the candidate seems stuck, nudge them with small hints, not full solutions.
- Do NOT mention that you are an AI or language model.
- Do NOT claim you represent ${company}.
- Only respond with ONE interviewer message per request.
`;

  const messages: { role: "system" | "user" | "assistant"; content: string }[] =
    [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "system",
        content: `Problem context:\nTitle: ${problem.title}\nPrompt: ${problem.prompt}\nConstraints: ${
          problem.constraints || "N/A"
        }\nCompany style: ${company}\nRole: ${role}`
      }
    ];

  for (const m of safeHistory) {
    if (!m || !m.text) continue;
    if (m.from === "candidate") {
      messages.push({
        role: "user",
        content: `Candidate: ${m.text}`
      });
    } else {
      messages.push({
        role: "assistant",
        content: `Interviewer: ${m.text}`
      });
    }
  }

  messages.push({
    role: "user",
    content: `Latest candidate message: ${userMessage}`
  });

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "openai/gpt-4.1-mini",
      messages,
      temperature: 0.4,
      max_tokens: 250
    })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      {
        error: "OpenRouter request failed",
        status: res.status,
        body: text
      },
      { status: 502 }
    );
  }

  const data = await res.json();
  const reply =
    data?.choices?.[0]?.message?.content?.trim() ||
    "Let's continue. Can you walk me through your approach in more detail?";

  return NextResponse.json({ reply });
}
