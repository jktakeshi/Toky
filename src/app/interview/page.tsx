"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Container, Row, Col, Form, Button } from "react-bootstrap";
import Editor from "@monaco-editor/react";
import styles from "./page.module.css";

type Problem = {
  id: string;
  title: string;
  prompt: string;
  functionSignature?: string;
  topics?: string[];
  difficulty?: string;
  constraints?: string;
  tests: any[];
};

type ChatMessage = {
  from: "interviewer" | "candidate";
  text: string;
};

export default function InterviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const company = (searchParams.get("company") || "generic").toLowerCase();
  const role = "newgrad";

  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasFetched = useRef(false);

  // Code editor state
  const [code, setCode] = useState("function solve() {\n  // your code here\n}");
  const [language, setLanguage] = useState("javascript");

  const templates: Record<string, string> = {
    javascript: "function solve() {\n  // your code here\n}",
    python: "def solve():\n    # your code here\n    pass",
    cpp: `#include <bits/stdc++.h>
using namespace std;

void solve() {
    // your code here
}

int main() {
    solve();
    return 0;
}`,
    java: `public class Solution {
    public static void solve() {
        // your code here
    }
}`,
  };

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const hasInitializedChat = useRef(false);

  // Voice state
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // --- Helpers ---

  const playBase64Audio = (audioBase64: string) => {
    if (!audioBase64) return;
    try {
      const byteChars = atob(audioBase64);
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play();
    } catch (e) {
      console.error("Audio decode/play error:", e);
    }
  };

  const appendInterviewerFallback = (text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        from: "interviewer",
        text,
      },
    ]);
  };

  // --- Fetch problem once ---

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const fetchProblem = async () => {
      try {
        const res = await fetch(`/api/problems?company=${company}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to generate problem");
        }

        setProblem(data);
      } catch (err: any) {
        console.error("Problem fetch error:", err);
        setError(err.message || "Failed to load problem");
      } finally {
        setLoading(false);
      }
    };

    fetchProblem();
  }, [company]);

  // --- Initial interviewer greeting ---

  useEffect(() => {
    if (!problem || hasInitializedChat.current) return;
    hasInitializedChat.current = true;

    setMessages([
      {
        from: "interviewer",
        text: `Hi, I'm your interviewer. This is a ${company}-style problem: "${problem.title}". Start by talking me through how you'd approach it.`,
      },
    ]);
  }, [problem, company]);

  // --- Handlers ---

  const handleEditorChange = (value: string | undefined) => {
    setCode(value || "");
  };

  const handleLanguageChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    setCode(templates[newLang]);
  };

  const handleSubmit = () => {
    router.push("/result");
  };

  // Shared function to call voice-interviewer (for both text + speech)
  const callVoiceInterviewer = async (
    candidateText: string,
    history: ChatMessage[]
  ) => {
    const res = await fetch("/api/voice-interviewer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        problem,
        history,
        userMessage: candidateText,
        role,
        company,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(
        "voice-interviewer API error:",
        res.status,
        text || "(no body)"
      );
      appendInterviewerFallback(
        "I'm having trouble responding by voice. Let's continue in text for now."
      );
      return;
    }

    const data = await res.json().catch(() => ({} as any));
    const reply: string =
      (data.reply && String(data.reply)) ||
      "Let's keep going. Can you elaborate on that?";

    setMessages((prev) => [
      ...prev,
      { from: "interviewer", text: reply },
    ]);

    if (data.audio) {
      playBase64Audio(String(data.audio));
    }
  };

  // --- Text chat submit ---

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!problem) return;

    const trimmed = input.trim();
    if (!trimmed || sending) return;

    const newHistory: ChatMessage[] = [
      ...messages,
      { from: "candidate", text: trimmed },
    ];

    setMessages(newHistory);
    setInput("");
    setSending(true);

    try {
      await callVoiceInterviewer(trimmed, newHistory);
    } catch (err) {
      console.error("handleSendMessage error:", err);
      appendInterviewerFallback(
        "I'm having trouble responding right now. Please continue explaining your approach."
      );
    } finally {
      setSending(false);
    }
  };

  // --- Voice turn ---

  const handleVoiceTurn = async (transcript: string) => {
    if (!problem) return;
    const trimmed = transcript.trim();
    if (!trimmed) return;

    const newHistory: ChatMessage[] = [
      ...messages,
      { from: "candidate", text: trimmed },
    ];
    setMessages(newHistory);

    try {
      setVoiceLoading(true);
      await callVoiceInterviewer(trimmed, newHistory);
    } catch (err) {
      console.error("handleVoiceTurn error:", err);
      appendInterviewerFallback(
        "I'm having trouble responding by voice. Let's continue in text for now."
      );
    } finally {
      setVoiceLoading(false);
    }
  };

  // --- Start Web Speech recognition ---

  const startVoice = () => {
    if (typeof window === "undefined") return;
    if (voiceLoading) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      appendInterviewerFallback(
        "Voice input is not supported in this browser. Please use the text box instead."
      );
      return;
    }

    // clean any previous instance
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onerror = (event: any) => {
      const err = event?.error;
      console.warn("SpeechRecognition error:", event);

      let msg: string;
      if (err === "not-allowed" || err === "service-not-allowed") {
        msg =
          "It looks like microphone access is blocked for this site. Please allow mic access in your browser settings, or use the text box.";
      } else if (err === "no-speech") {
        msg =
          "I didn't catch any speech. Please try again and speak clearly, or type your answer.";
      } else if (err === "audio-capture") {
        msg =
          "I couldn't access your microphone. Check your input device, or use the text box.";
      } else if (err === "network") {
        msg =
          "Your browser's speech service had a network issue, so I can't use voice reliably. Let's continue in text.";
      } else {
        msg =
          "I couldn't process your speech. Please try again, or use the text box.";
      }

      setIsListening(false);
      appendInterviewerFallback(msg);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      await handleVoiceTurn(transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // --- Render ---

  if (loading) {
    return (
      <div className={styles.loading}>
        Generating a {company}-style interview question...
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className={styles.error}>
        Failed to load problem: {error || "Unknown error"}
      </div>
    );
  }

  return (
    <Container fluid className={styles.container}>
      <Row className="vh-100">
        {/* Left Panel: Question + Chat */}
        <Col md={5} className={`${styles.panel} ${styles.questionPanel}`}>
          <h2>{problem.title}</h2>
          <p>{problem.prompt}</p>

          {problem.constraints && (
            <p>
              <strong>Constraints:</strong> {problem.constraints}
            </p>
          )}

          <div className={styles.chatContainer}>
            <div className={styles.chatMessages}>
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={
                    m.from === "interviewer"
                      ? styles.interviewerMessage
                      : styles.candidateMessage
                  }
                >
                  <strong>
                    {m.from === "interviewer" ? "Interviewer" : "You"}:
                  </strong>{" "}
                  {m.text}
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className={styles.chatInputRow}>
              <input
                type="text"
                className={styles.chatInput}
                placeholder="Type your explanation or question..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <Button
                type="submit"
                variant="primary"
                disabled={sending || !input.trim()}
              >
                {sending ? "..." : "Send"}
              </Button>
            </form>

            <div className="mt-2 text-center">
              <Button
                variant={isListening ? "danger" : "outline-secondary"}
                size="sm"
                onClick={startVoice}
                disabled={voiceLoading}
              >
                {isListening
                  ? "Listening..."
                  : voiceLoading
                  ? "Processing..."
                  : "Speak Answer"}
              </Button>
            </div>
          </div>

          <div className="mt-4 text-center">
            <Button
              variant="success"
              size="lg"
              onClick={handleSubmit}
              className="px-5 py-2 rounded-full"
            >
              Submit Solution
            </Button>
          </div>
        </Col>

        {/* Right Panel: IDE */}
        <Col md={7} className={`${styles.panel} ${styles.idePanel}`}>
          <Row>
            <Col md={6}>
              <div className="d-flex justify-left align-items-center mb-3">
                <Form.Select
                  value={language}
                  onChange={handleLanguageChange}
                  style={{ width: "200px" }}
                >
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="cpp">C++</option>
                  <option value="java">Java</option>
                </Form.Select>
              </div>
            </Col>
            <Col md={6}>
              <div className="d-flex justify-content-end">
                <Button
                  variant="success"
                  size="lg"
                  onClick={handleSubmit}
                  className="px-4 py-1 rounded-full"
                >
                  Submit Solution
                </Button>
              </div>
            </Col>
          </Row>

          <Editor
            height="90%"
            language={language}
            value={code}
            onChange={handleEditorChange}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
            }}
          />
        </Col>
      </Row>
    </Container>
  );
}
