import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;

// Pick a fixed voice ID from your ElevenLabs dashboard
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb";

export async function POST(req: NextRequest) {
  if (!OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: "Missing OPENROUTER_API_KEY on server" },
      { status: 500 }
    );
  }

  if (!ELEVENLABS_API_KEY) {
    return NextResponse.json(
      { error: "Missing ELEVENLABS_API_KEY on server" },
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

  const { problem, answer, company = "generic", role = "newgrad" } = body;

  if (!problem || !problem.title || !problem.prompt) {
    return NextResponse.json(
      { error: "Missing or invalid 'problem' in request body" },
      { status: 400 }
    );
  }

  if (!answer || typeof answer !== "string") {
    return NextResponse.json(
      { error: "Missing 'answer' (candidate's code/thoughts) in request body" },
      { status: 400 }
    );
  }

  // 1) Ask GPT to generate short spoken-style feedback
  const systemPrompt = `
You are a senior engineer interviewer.
Given the coding problem and the candidate's answer, produce concise spoken feedback.
Rules:
- Max 4 sentences.
- Speak as if you're talking to the candidate.
- Focus on correctness, complexity, edge cases, and communication.
- Do NOT output code.
- Do NOT mention that you are an AI.
- This feedback will be read aloud with text-to-speech.
`;

  const gptRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "openai/gpt-4.1-mini",
      temperature: 0.4,
      max_tokens: 250,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content:
            `Company style: ${company}, Role: ${role}\n` +
            `Problem: ${problem.title}\n${problem.prompt}\n` +
            `Candidate answer:\n${answer}`
        }
      ]
    })
  });

  if (!gptRes.ok) {
    const text = await gptRes.text().catch(() => "");
    return NextResponse.json(
      { error: "OpenRouter request failed", detail: text },
      { status: 502 }
    );
  }

  const gptData = await gptRes.json();
  const feedbackText: string =
    gptData?.choices?.[0]?.message?.content?.trim() ||
    "Thanks for your attempt. I'd like to see more detail on your approach and edge cases.";

  // 2) Send that feedback text to ElevenLabs TTS
  const ttsRes = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg"
      },
      body: JSON.stringify({
        text: feedbackText,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    }
  );

  if (!ttsRes.ok) {
    const text = await ttsRes.text().catch(() => "");
    return NextResponse.json(
      {
        error: "ElevenLabs TTS request failed",
        detail: text,
        fallbackText: feedbackText
      },
      { status: 502 }
    );
  }

  const audioBuffer = Buffer.from(await ttsRes.arrayBuffer());

  // 3) Return raw audio so the frontend can play it
  return new NextResponse(audioBuffer, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": audioBuffer.length.toString(),
      // allow frontend fetch
      "Access-Control-Allow-Origin": "*"
    }
  });
}
