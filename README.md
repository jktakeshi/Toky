# Toky – AI Technical Interview Simulator

Toky is a full-stack web application that simulates realistic technical interviews in the browser.

It combines:
- Company-style coding questions generated on demand
- An in-browser IDE with language templates
- Automated JavaScript code evaluation against real test cases
- An AI interviewer (text + voice) for live-style interview conversations
- AI-driven feedback with optimal solutions and scoring

Built in under 24 hours at a hackathon, Toky is designed as a practical, extensible playground for preparing for real technical interviews.

---

## Core Features

### 1. Company-Style Question Generation

- Generates one original coding interview problem at a time.
- Tailored by:
  - **Company style** (e.g. Google/Meta/Amazon/generic)
  - **Difficulty** (easy / medium / hard)
  - **Role/seniority** (intern / new grad / etc.)
- Problems are returned as strict JSON with:
  - `title`
  - `prompt`
  - `functionSignature`
  - `topics`
  - `constraints`
  - `tests[]` (description, input, expected)

**Implementation:** `src/app/api/problems/route.ts` uses OpenRouter (GPT-4.1-mini) with strong schema constraints.

---

### 2. Interactive Coding Environment

- Built with **Next.js (App Router)**, **React**, **TypeScript**.
- Uses **Monaco Editor** for an IDE-like coding experience.
- Language templates for:
  - JavaScript
  - Python
  - C++
  - Java
- Users implement a `solve(...)`-style function based on the prompt.

> Note: At the moment, automated execution is implemented for **JavaScript**. Other languages are scaffolded via templates and are planned for future execution support.

**Implementation:** `src/app/interview/page.tsx`

---

### 3. Automated Code Evaluation

- Runs user-submitted **JavaScript** solutions against problem-specific test cases.
- For each test:
  - Executes `solve(...)` with the given inputs.
  - Compares the result to the expected output (supports primitives, arrays, and objects).
  - Returns a structured result: `passed`, `actual`, `expected`, and any runtime error.
- Computes:
  - `passedCount`
  - `totalTests`
  - `score` (0–100 based on pass rate)

If a non-supported language is selected, the API responds with an explicit error message so the behavior is clear.

**Implementation:** `src/app/api/evaluate/route.ts`

---

### 4. AI Interviewer (Text + Voice)

Toky simulates a real interviewer who responds to your reasoning and code in real time.

- **Chat-based interviewer**
  - Asks follow-up questions
  - Probes for complexity, edge cases, trade-offs
  - Adapts tone to the selected company style and role
  - Uses recent conversation history for context

- **Voice support**
  - Uses the browser’s Web Speech API (where available) to capture spoken answers.
  - Uses ElevenLabs Text-to-Speech (if configured) to speak interviewer responses.
  - Falls back gracefully to text-only interaction if voice is unavailable.

**Implementation:**  
- Frontend chat + voice UI: `src/app/interview/page.tsx`  
- Interviewer backend: `src/app/api/voice-interviewer/route.ts`  

---

### 5. AI Feedback & Optimal Solutions

After submitting a solution, Toky:

1. Requests an optimal solution for the generated problem in the chosen language.
2. Compares:
   - Your code
   - Test results
   - The optimal solution
3. Produces:
   - Concise, conversational feedback (correctness, code quality, edge cases, reasoning)
   - A final score that blends:
     - Test score (based on passed tests)
     - AI assessment score

The goal is to emulate what a senior interviewer might say after an interview.

**Implementation:** `src/app/api/feedback/route.ts`

---

## Tech Stack

**Frontend**

- Next.js (App Router)
- React + TypeScript
- Monaco Editor
- React-Bootstrap & custom CSS for layout and styling

**Backend / APIs**

- Next.js Route Handlers under `src/app/api`
- OpenRouter (LLM) for:
  - Question generation
  - Optimal solutions
  - Interviewer dialogue
  - Feedback generation
- ElevenLabs (optional) for Text-to-Speech

**Notes**

- All APIs are stateless and designed to be easily swappable (e.g., you can plug in another LLM or TTS provider).
- Client-side speech recognition uses the browser’s native `SpeechRecognition` / `webkitSpeechRecognition` when available.

---

## Getting Started

### 1. Prerequisites

- **Node.js** v18+
- **npm** or **yarn**
- API keys for:
  - **OpenRouter** (LLM)
  - **ElevenLabs** (optional, for TTS)

### 2. Clone the Repository

```bash
git clone https://github.com/jktakeshi/Toky.git
cd Toky
```

### 3. Install Dependencies

```bash
npm install
# or
yarn install
```

### 4. Environment Variables

Create a `.env.local` file in the project root:

```bash
# Required for problem generation, feedback, and interviewer
OPENROUTER_API_KEY=your_openrouter_key_here

# Optional: enable voice output from the interviewer
ELEVENLABS_API_KEY=your_elevenlabs_key_here
ELEVENLABS_VOICE_ID=your_voice_id_here
```

### 5. Run the Dev Server

```bash
npm run dev
# or
yarn dev
```