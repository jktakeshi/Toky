import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;

export async function POST(req: NextRequest) {
  if (!OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: "Missing OPENROUTER_API_KEY on server" },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { problem, code, evalResult, role, company } = body;

  // Minimal validation
  if (!problem || !code || !evalResult) {
    return NextResponse.json(
      { error: "Missing 'problem', 'code', or 'evalResult' in request body" },
      { status: 400 }
    );
  }

  // Build a strict, interview-style feedback prompt
  const messages = [
    {
      role: "system",
      content:
        "You are a senior software engineer conducting a coding interview.\n" +
        "- Use ONLY the provided problem, candidate code, and test results as ground truth.\n" +
        "- Do NOT claim to be from any specific company.\n" +
        "- Be concise, clear, and structured.\n" +
        "- Do NOT invent tests or behavior that are not shown.\n"
    },
    {
      role: "user",
      content: `
Role: ${role || "unspecified"}
Target company style: ${company || "generic"}

Problem:
Title: ${problem.title}
Prompt: ${problem.prompt}
Constraints: ${problem.constraints || "N/A"}
Topics: ${(problem.topics || []).join(", ")}

Candidate's code:
${code}

Test results (JSON):
${JSON.stringify(evalResult, null, 2)}

Please provide feedback with the following structure (plain text):

1. Correctness
- Did the solution pass the tests?
- If some tests failed or there was a runtime error, clearly explain why in 1-3 sentences.

2. Complexity
- Estimate the time and space complexity based on the code.

3. Code Quality & Communication
- Comment on readability, structure, edge cases, and how you'd feel about this in a real interview.

4. Next Steps
- 3 concrete, actionable suggestions to improve.

5. Score
- Overall rating from 1 to 5 for this round (1 = poor, 3 = borderline, 5 = strong pass).
`
    }
  ];

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "openai/gpt-4.1-mini", // adjust if you prefer another OpenRouter model
      messages,
      temperature: 0.3
    })
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    return NextResponse.json(
      {
        error: "OpenRouter request failed",
        status: res.status,
        body: errorText
      },
      { status: 502 }
    );
  }

  const data = await res.json();
  const feedback = data?.choices?.[0]?.message?.content?.trim() || "";

  if (!feedback) {
    return NextResponse.json(
      { error: "No feedback generated", raw: data },
      { status: 502 }
    );
  }

  return NextResponse.json({ feedback });
}
