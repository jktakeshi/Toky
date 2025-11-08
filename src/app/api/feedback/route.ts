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

  const { problem, code, evalResult, role, company, language } = body;

  // Minimal validation
  if (!problem || !code || !evalResult) {
    return NextResponse.json(
      { error: "Missing 'problem', 'code', or 'evalResult' in request body" },
      { status: 400 }
    );
  }

  // First, get the optimal solution from AI
  const solutionMessages = [
    {
      role: "system",
      content:
        "You are a senior software engineer providing optimal solutions to coding problems.\n" +
        "- Provide clean, efficient, and well-commented code.\n" +
        "- Follow best practices for the given language.\n" +
        "- Ensure the solution passes all test cases.\n"
    },
    {
      role: "user",
      content: `
Problem:
Title: ${problem.title}
Prompt: ${problem.prompt}
Constraints: ${problem.constraints || "N/A"}
Topics: ${(problem.topics || []).join(", ")}
Function Signature: ${problem.functionSignature || "N/A"}

Test Cases:
${JSON.stringify(problem.tests, null, 2)}

Please provide an optimal solution in ${language || "javascript"} that:
1. Solves the problem correctly
2. Has optimal time and space complexity
3. Is clean and well-commented
4. Handles all edge cases

Return ONLY the code solution, no explanations.
`
    }
  ];

  // Get the solution
  const solutionRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "openai/gpt-4.1-mini",
      messages: solutionMessages,
      temperature: 0.2
    })
  });

  if (!solutionRes.ok) {
    const errorText = await solutionRes.text().catch(() => "");
    return NextResponse.json(
      {
        error: "Failed to generate solution",
        status: solutionRes.status,
        body: errorText
      },
      { status: 502 }
    );
  }

  const solutionData = await solutionRes.json();
  const solution = solutionData?.choices?.[0]?.message?.content?.trim() || "";

  if (!solution) {
    return NextResponse.json(
      { error: "No solution generated", raw: solutionData },
      { status: 502 }
    );
  }

  // Calculate score based on test results
  const testScore = evalResult.score || 0; // 0-100 based on passed tests
  const passedTests = evalResult.passedCount || 0;
  const totalTests = evalResult.totalTests || 1;

  // Now generate feedback comparing the code with the solution
  const feedbackMessages = [
    {
      role: "system",
      content:
        "You are a senior software engineer conducting a coding interview.\n" +
        "- Compare the candidate's code with the optimal solution.\n" +
        "- Provide specific, actionable feedback on how to fix the code.\n" +
        "- Be constructive and educational.\n" +
        "- Calculate a score from 0-100 based on correctness, code quality, and similarity to optimal solution.\n"
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

Optimal solution:
${solution}

Test results:
- Passed: ${passedTests}/${totalTests}
- Test Score: ${testScore}/100
- Results: ${JSON.stringify(evalResult.results || [], null, 2)}

Please provide concise, conversational feedback (2-3 paragraphs maximum). Do NOT use lists or numbered items. Write in a natural, flowing style.

Structure your response as:
- A brief opening paragraph summarizing the overall performance and test results
- A middle paragraph explaining the key issues and how to fix them, referencing the optimal solution approach
- A closing paragraph with complexity analysis and final thoughts

Keep it concise (under 200 words total). Be constructive and specific but avoid lengthy explanations.

At the end, provide a score from 0-100 in this exact format: "SCORE: [number]"
`
    }
  ];

  const feedbackRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "openai/gpt-4.1-mini",
      messages: feedbackMessages,
      temperature: 0.3
    })
  });

  if (!feedbackRes.ok) {
    const errorText = await feedbackRes.text().catch(() => "");
    return NextResponse.json(
      {
        error: "OpenRouter request failed",
        status: feedbackRes.status,
        body: errorText
      },
      { status: 502 }
    );
  }

  const feedbackData = await feedbackRes.json();
  const feedback = feedbackData?.choices?.[0]?.message?.content?.trim() || "";

  if (!feedback) {
    return NextResponse.json(
      { error: "No feedback generated", raw: feedbackData },
      { status: 502 }
    );
  }

  // Extract score from feedback (look for "SCORE: XX" pattern)
  let aiScore = testScore; // Default to test score
  const scoreMatch = feedback.match(/SCORE:\s*(\d+)/i);
  if (scoreMatch) {
    aiScore = parseInt(scoreMatch[1], 10);
  } else {
    // Fallback: look for other patterns
    const fallbackMatch = feedback.match(/Score:\s*(\d+)/i) ||
                         feedback.match(/(\d+)\s*\/\s*100/i);
    if (fallbackMatch) {
      aiScore = parseInt(fallbackMatch[1], 10);
    }
  }

  // Use a weighted average: 60% test score, 40% AI assessment
  const finalScore = Math.round(testScore * 0.6 + aiScore * 0.4);

  return NextResponse.json({ 
    feedback,
    solution,
    score: finalScore,
    testScore,
    aiScore
  });
}
