import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;

export async function GET(req: NextRequest) {
  if (!OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: "Missing OPENROUTER_API_KEY on server" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);

  const company = (searchParams.get("company") || "generic").toLowerCase();
  const difficulty = (searchParams.get("difficulty") || "medium").toLowerCase();
  const role = (searchParams.get("role") || "newgrad").toLowerCase();

  const prompt = `
Generate ONE ORIGINAL coding interview problem as strict JSON.

Tailor it to:
- Company style: "${company}"
- Difficulty: "${difficulty}"
- Role/seniority: "${role}"

Rules:
- Must be original. Do NOT copy or paraphrase LeetCode or any other site.
- It should feel like a realistic ${company}-style interview question for a ${difficulty} ${role}.
- Include 3-5 test cases that match the description.
- Output ONLY valid JSON matching this schema (no markdown, no comments, no backticks):

{
  "id": "string-lowercase-with-dashes",
  "title": "Short descriptive title",
  "prompt": "Full problem statement, clear and self-contained.",
  "functionSignature": "Suggested function signature or description",
  "topics": ["arrays", "hashmap"],
  "difficulty": "easy|medium|hard",
  "roles": ["intern","newgrad","swe1"],
  "companyStyle": ["google","meta","amazon","generic"],
  "constraints": "Key constraints and input bounds.",
  "tests": [
    {
      "description": "what this test checks",
      "input": { "example": "shape depends on problem" },
      "expected": "expected output here"
    }
  ]
}
`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You ONLY respond with valid JSON exactly matching the requested schema. No explanations. No markdown. No code fences. No surrounding text.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
      // Ask for structured JSON; OpenRouter passes this through for compatible models.
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      {
        error: "OpenRouter request failed",
        status: res.status,
        detail: text,
      },
      { status: 502 }
    );
  }

  const data = await res.json();
  let content = data?.choices?.[0]?.message?.content;

  if (!content) {
    return NextResponse.json(
      { error: "No content from OpenRouter", raw: data },
      { status: 502 }
    );
  }

  // Handle cases where model still wraps JSON in ``` or adds junk.
  if (typeof content === "string") {
    let trimmed = content.trim();

    // Strip ```json ... ``` or ``` ... ```
    if (trimmed.startsWith("```")) {
      trimmed = trimmed.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    }

    content = trimmed;
  }

  let problem;
  try {
    problem = typeof content === "string" ? JSON.parse(content) : content;
  } catch (e) {
    return NextResponse.json(
      {
        error: "Model response was not valid JSON",
        raw: content,
      },
      { status: 502 }
    );
  }

  // Minimal validation for what the frontend relies on
  if (
    !problem ||
    typeof problem !== "object" ||
    !problem.id ||
    !problem.title ||
    !problem.prompt ||
    !problem.tests
  ) {
    return NextResponse.json(
      {
        error: "Generated problem missing required fields",
        raw: problem,
      },
      { status: 502 }
    );
  }

  return NextResponse.json(problem);
}
