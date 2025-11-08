import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;
const ELEVENLABS_VOICE_ID =
  process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb"; // fallback demo-ish voice

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
    company = "generic",
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

Rules:
- Speak ONLY as the interviewer (never as the candidate).
- Be concise, technical, and targeted.
- Use the given coding problem as the source of truth.
- Ask focused follow-ups, probe trade-offs, ask for complexity, edge cases, etc.
- If the candidate is stuck, give gentle hints but never the full solution.
- Tailor tone slightly to a ${company}-style ${role} interview.
- Do NOT say you are an AI or language model.
- One short response per turn.
`;

  const messages: { role: "system" | "user" | "assistant"; content: string }[] =
    [
      { role: "system", content: systemPrompt },
      {
        role: "system",
        content: `Problem context:
Title: ${problem.title}
Prompt: ${problem.prompt}
Constraints: ${problem.constraints || "N/A"}
Company style: ${company}
Role: ${role}`,
      },
    ];

  for (const m of safeHistory) {
    if (!m || !m.text) continue;
    if (m.from === "candidate") {
      messages.push({
        role: "user",
        content: `Candidate: ${m.text}`,
      });
    } else {
      messages.push({
        role: "assistant",
        content: `Interviewer: ${m.text}`,
      });
    }
  }

  messages.push({
    role: "user",
    content: `Latest candidate message: ${userMessage}`,
  });

  // --- Call OpenRouter for interviewer reply ---
  const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-4.1-mini",
      messages,
      temperature: 0.4,
      max_tokens: 250,
    }),
  });

  if (!orRes.ok) {
    const text = await orRes.text().catch(() => "");
    return NextResponse.json(
      {
        error: "OpenRouter request failed",
        status: orRes.status,
        body: text || "(no body)",
      },
      { status: 502 }
    );
  }

  const orData = await orRes.json().catch(() => null);
  const replyRaw =
    orData?.choices?.[0]?.message?.content?.trim() ||
    "Let's continue. Can you walk me through your approach in more detail?";
  const reply = replyRaw.replace(/^Interviewer:\s*/i, "").trim();

  // --- Optional: ElevenLabs TTS ---
  if (!ELEVENLABS_API_KEY || !ELEVENLABS_VOICE_ID) {
    // No TTS configured; return text only
    return NextResponse.json({ reply });
  }

  try {
    const ttsRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: reply,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.7,
          },
        }),
      }
    );

    if (!ttsRes.ok) {
      const text = await ttsRes.text().catch(() => "");
      return NextResponse.json(
        {
          reply,
          audio: null,
          ttsError: `TTS failed: ${ttsRes.status} ${text || ""}`,
        },
        { status: 200 }
      );
    }

    const audioBuffer = await ttsRes.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString("base64");

    return NextResponse.json({
      reply,
      audio: audioBase64,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        reply,
        audio: null,
        ttsError: `TTS exception: ${e?.message || e}`,
      },
      { status: 200 }
    );
  }
}
