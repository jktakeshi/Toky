import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

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

  const {
    problem,
    code,
    conversationHistory,
    message,
    action, // "question", "hint", "evaluate", "followup"
    role,
    company,
    language,
  } = body;

  if (!problem) {
    return NextResponse.json(
      { error: "Missing 'problem' in request body" },
      { status: 400 }
    );
  }

  // Build system message based on action type
  let systemMessage = "";
  let userMessage = "";

  if (action === "start") {
    systemMessage = `You are a senior software engineer conducting a coding interview at ${company || "a tech company"}.
- You are interviewing a candidate for a ${role || "software engineering"} position.
- Start the interview by greeting the candidate and asking about their approach to the problem.
- Be professional, friendly, and supportive.
- Encourage them to think out loud and explain their thought process.`;

    userMessage = `Problem:
Title: ${problem.title}
Prompt: ${problem.prompt}
Constraints: ${problem.constraints || "N/A"}
Topics: ${(problem.topics || []).join(", ")}

Start the interview by greeting the candidate and asking them how they would approach this problem.`;
  } else if (action === "hint") {
    systemMessage = `You are a senior software engineer conducting a coding interview at ${company || "a tech company"}.
- The candidate is working on a coding problem and has requested a hint.
- Provide a helpful hint that guides them without giving away the solution completely.
- Be encouraging and constructive.
- Keep hints concise (2-3 sentences).`;

    userMessage = `Problem:
Title: ${problem.title}
Prompt: ${problem.prompt}
Constraints: ${problem.constraints || "N/A"}
Topics: ${(problem.topics || []).join(", ")}

Candidate's current code:
${code || "No code written yet"}

Please provide a helpful hint to guide the candidate toward the solution.`;
  } else if (action === "evaluate") {
    systemMessage = `You are a senior software engineer conducting a coding interview at ${company || "a tech company"}.
- The candidate has explained their approach or answered a question.
- Evaluate their response and provide constructive feedback.
- Ask follow-up questions if their explanation is unclear or incomplete.
- Be professional and supportive.
- Reference their code when relevant.`;

    userMessage = `Problem:
Title: ${problem.title}
Prompt: ${problem.prompt}
Constraints: ${problem.constraints || "N/A"}
Topics: ${(problem.topics || []).join(", ")}

Candidate's current code:
${code || "No code written yet"}

Candidate's response to your question:
${message || "No specific response provided"}

Please evaluate this response. Provide feedback, ask clarifying questions, or continue the interview conversation naturally.`;
  } else if (action === "followup") {
    systemMessage = `You are a senior software engineer conducting a coding interview at ${company || "a tech company"}.
- You are asking follow-up questions to understand the candidate's thinking.
- Ask questions about:
  * Time and space complexity
  * Edge cases
  * Optimization opportunities
  * Alternative approaches
- Keep questions concise and focused on one topic at a time.
- Be conversational and professional.`;

    userMessage = `Problem:
Title: ${problem.title}
Prompt: ${problem.prompt}
Constraints: ${problem.constraints || "N/A"}
Topics: ${(problem.topics || []).join(", ")}

Candidate's code:
${code || "No code written yet"}

Conversation so far:
${conversationHistory.map((msg: Message) => `${msg.role}: ${msg.content}`).join("\n\n")}

Based on the candidate's code and our conversation, ask a relevant follow-up question. Examples:
- "Can you explain the time complexity of your solution?"
- "What would happen if the input size doubled?"
- "How would you handle edge cases like an empty array?"
- "Is there a way to optimize the space complexity?"
- "Can you walk me through your approach step by step?"`;
  } else {
    // Default: general conversation or response
    systemMessage = `You are a senior software engineer conducting a coding interview at ${company || "a tech company"}.
- You are interviewing a candidate for a ${role || "software engineering"} position.
- Engage in natural conversation about their approach and solution.
- Be professional, friendly, and supportive.
- Ask thoughtful questions about their solution.
- Provide guidance when appropriate.`;

    userMessage = `Problem:
Title: ${problem.title}
Prompt: ${problem.prompt}
Constraints: ${problem.constraints || "N/A"}
Topics: ${(problem.topics || []).join(", ")}

Candidate's code:
${code || "No code written yet"}

${message ? `Candidate said: ${message}` : "Continue the interview conversation naturally."}

Please respond as the interviewer.`;
  }

  // Build messages array
  const messages: Message[] = [
    { role: "system", content: systemMessage },
  ];

  // Add conversation history if available (for follow-up conversations)
  if (conversationHistory && Array.isArray(conversationHistory)) {
    // Add previous conversation messages (excluding system messages)
    conversationHistory.forEach((msg: Message) => {
      if (msg.role !== "system") {
        messages.push(msg);
      }
    });
  }

  // Add current user message
  // For all actions, we include the userMessage which contains the context
  messages.push({ role: "user", content: userMessage });

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-4.1-mini",
      messages,
      temperature: 0.7, // Slightly higher for more natural conversation
    }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    return NextResponse.json(
      {
        error: "OpenRouter request failed",
        status: res.status,
        body: errorText,
      },
      { status: 502 }
    );
  }

  const data = await res.json();
  const response = data?.choices?.[0]?.message?.content?.trim() || "";

  if (!response) {
    return NextResponse.json(
      { error: "No response generated", raw: data },
      { status: 502 }
    );
  }

  return NextResponse.json({ 
    response,
    message: {
      role: "assistant",
      content: response,
    },
  });
}

