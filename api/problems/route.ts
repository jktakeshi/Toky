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

  const company = (searchParams.get("company") || "generic").toLowerCase(); // "google" | "meta" | "amazon" | ...
  const difficulty = (searchParams.get("difficulty") || "medium").toLowerCase(); // "easy" | "medium" | "hard"
  const role = (searchParams.get("role") || "newgrad").toLowerCase(); // "intern" | "newgrad" | "swe1"

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
- Output ONLY valid JSON matching this schema (no markdown, no comments):

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
            "You ONLY respond with valid JSON exactly matching the requested schema. No explanations.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
    }),
  });

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    return NextResponse.json(
      { error: "No content from OpenRouter", raw: data },
      { status: 502 }
    );
  }

  let problem;
  try {
    problem = JSON.parse(content);
  } catch (e) {
    return NextResponse.json(
      { error: "Model response was not valid JSON", raw: content },
      { status: 502 }
    );
  }

  // (Optional) minimal validation
  if (!problem.id || !problem.title || !problem.prompt || !problem.tests) {
    return NextResponse.json(
      { error: "Generated problem missing required fields", raw: problem },
      { status: 502 }
    );
  }

  return NextResponse.json(problem);
}
