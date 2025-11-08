"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Container, Row, Col, Form, Button } from "react-bootstrap";
import Editor from "@monaco-editor/react";
import styles from "./page.module.css";

// Type definitions for Web Speech API
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

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

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function InterviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const company = (searchParams.get("company") || "generic").toLowerCase();

  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Mock Interview Mode
  const [mockInterviewMode, setMockInterviewMode] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const [chatMessage, setChatMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<"problem" | "chat">("problem");
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Voice/Speech Recognition
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);

  // Track if we've already fetched to avoid double-fetch in React Strict Mode
  const hasFetched = useRef(false);

  // Code state
  const [code, setCode] = useState<string>(
    "function solve() {\n  // your code here\n}"
  );
  const [language, setLanguage] = useState<string>("javascript");

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
}`
  };

  // Fetch a company-specific problem on mount
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
        setError(err.message || "Failed to load problem");
      } finally {
        setLoading(false);
      }
    };

    fetchProblem();
  }, [company]);

  // Initialize interview when mock interview mode is enabled
  useEffect(() => {
    if (mockInterviewMode && problem && conversationHistory.length === 0) {
      startInterview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mockInterviewMode, problem]);

  // Scroll chat to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationHistory]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check for browser support
      const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognitionClass) {
        setSpeechSupported(true);
        const recognitionInstance = new SpeechRecognitionClass() as SpeechRecognition;
        recognitionInstance.continuous = false;
        recognitionInstance.interimResults = false;
        recognitionInstance.lang = 'en-US';

        recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = event.results[0][0].transcript;
          setChatMessage(prev => prev + (prev ? ' ' : '') + transcript);
          setIsListening(false);
        };

        recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          if (event.error === 'no-speech') {
            setError('No speech detected. Please try again.');
          } else if (event.error === 'not-allowed') {
            setError('Microphone permission denied. Please enable microphone access.');
          } else {
            setError('Speech recognition error. Please try again.');
          }
        };

        recognitionInstance.onend = () => {
          setIsListening(false);
        };

        setRecognition(recognitionInstance);

        // Cleanup function
        return () => {
          try {
            recognitionInstance.stop();
          } catch (e) {
            // Ignore errors during cleanup
          }
        };
      } else {
        setSpeechSupported(false);
      }
    }
  }, []);

  const startInterview = async () => {
    if (!problem) return;

    setIsSending(true);
    try {
      const res = await fetch("/api/interviewer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem,
          code,
          action: "start",
          role: searchParams.get("role") || "newgrad",
          company,
          language,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to start interview");
      }

      const data = await res.json();
      setConversationHistory([
        {
          role: "assistant",
          content: data.response,
        },
      ]);
    } catch (error: any) {
      setError(error.message || "Failed to start interview");
    } finally {
      setIsSending(false);
    }
  };

  const sendMessage = async (action: "message" | "hint" | "followup" = "message") => {
    if (!problem || isSending || (!chatMessage.trim() && action === "message")) return;

    // Stop listening if active
    if (isListening && recognition) {
      recognition.stop();
      setIsListening(false);
    }

    const userMessage: Message = {
      role: "user",
      content: chatMessage || (action === "hint" ? "Can you give me a hint?" : (action === "followup" ? "Can you ask me a follow-up question?" : "")),
    };

    // Add user message to history
    const updatedHistory = [...conversationHistory, userMessage];
    setConversationHistory(updatedHistory);
    const messageToSend = chatMessage;
    setChatMessage("");
    setIsSending(true);

    try {
      const res = await fetch("/api/interviewer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem,
          code, // Always send the latest code
          conversationHistory: conversationHistory, // Send history before adding user message
          message: messageToSend || userMessage.content,
          action: action === "message" ? (messageToSend ? "evaluate" : "followup") : action,
          role: searchParams.get("role") || "newgrad",
          company,
          language,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to get response from interviewer");
      }

      const data = await res.json();
      setConversationHistory([...updatedHistory, data.message]);
    } catch (error: any) {
      setError(error.message || "Failed to send message");
      // Remove user message on error
      setConversationHistory(conversationHistory);
      setChatMessage(messageToSend); // Restore message
    } finally {
      setIsSending(false);
    }
  };

  const requestHint = () => {
    sendMessage("hint");
  };

  const requestFollowUp = () => {
    sendMessage("followup");
  };

  const handleChatKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage("message");
    }
  };

  const toggleListening = () => {
    if (!recognition) {
      setError('Speech recognition not supported in this browser.');
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      try {
        recognition.start();
        setIsListening(true);
        setError(null);
      } catch (err) {
        console.error('Error starting recognition:', err);
        setError('Failed to start microphone. Please check permissions.');
        setIsListening(false);
      }
    }
  };

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

  const handleSubmit = async () => {
    if (!problem || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      // First, evaluate the code
      const evalRes = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          problem,
          language,
        }),
      });

      if (!evalRes.ok) {
        const errorData = await evalRes.json();
        throw new Error(errorData.error || "Evaluation failed");
      }

      const evalResult = await evalRes.json();

      // Then, get feedback
      const feedbackRes = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem,
          code,
          evalResult,
          role: searchParams.get("role") || "newgrad",
          company,
          language,
        }),
      });

      if (!feedbackRes.ok) {
        const errorData = await feedbackRes.json();
        throw new Error(errorData.error || "Feedback generation failed");
      }

      const feedbackData = await feedbackRes.json();

      // Store results in sessionStorage to pass to results page
      sessionStorage.setItem(
        "interviewResults",
        JSON.stringify({
          problem,
          code,
          evalResult,
          feedback: feedbackData.feedback,
          solution: feedbackData.solution,
          score: feedbackData.score,
          testScore: feedbackData.testScore,
          aiScore: feedbackData.aiScore,
        })
      );

      router.push("/result");
    } catch (error: any) {
      setError(error.message || "Failed to submit solution");
      setSubmitting(false);
    }
  };

  // Loading & error states
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
        {/* Left Panel: Problem/Interview */}
        <Col
          md={5}
          className={`${styles.panel} ${styles.questionPanel}`}
        >
          {/* Mock Interview Mode Toggle */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="mb-0">{problem.title}</h2>
            <Form.Check
              type="switch"
              id="mock-interview-switch"
              label="Mock Interview Mode"
              checked={mockInterviewMode}
              onChange={(e) => {
                setMockInterviewMode(e.target.checked);
                if (e.target.checked) {
                  setActiveTab("chat");
                } else {
                  setActiveTab("problem");
                  setConversationHistory([]);
                }
              }}
            />
          </div>

          {/* Tabs for Problem and Chat */}
          {mockInterviewMode && (
            <div className="mb-3">
              <Button
                variant={activeTab === "problem" ? "primary" : "outline-primary"}
                size="sm"
                onClick={() => setActiveTab("problem")}
                className="me-2"
              >
                Problem
              </Button>
              <Button
                variant={activeTab === "chat" ? "primary" : "outline-primary"}
                size="sm"
                onClick={() => setActiveTab("chat")}
              >
                Interview Chat
              </Button>
            </div>
          )}

          {/* Problem Tab Content */}
          {(activeTab === "problem" || !mockInterviewMode) && (
            <div>
              <p>{problem.prompt}</p>

              {problem.constraints && (
                <p>
                  <strong>Constraints:</strong> {problem.constraints}
                </p>
              )}

              {error && (
                <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded text-red-700 dark:text-red-400">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Chat Tab Content */}
          {mockInterviewMode && activeTab === "chat" && (
            <div className={styles.chatContainer}>
              <div className={styles.chatMessages}>
                {conversationHistory.length === 0 && !isSending && (
                  <div className="text-center text-muted p-4">
                    Starting interview...
                  </div>
                )}
                {conversationHistory.map((msg, index) => (
                  <div
                    key={index}
                    className={`${styles.chatMessage} ${
                      msg.role === "user" ? styles.userMessage : styles.assistantMessage
                    }`}
                  >
                    <div className={styles.messageRole}>
                      {msg.role === "user" ? "You" : "Interviewer"}
                    </div>
                    <div className={styles.messageContent}>{msg.content}</div>
                  </div>
                ))}
                {isSending && (
                  <div className={styles.chatMessage}>
                    <div className={styles.messageRole}>Interviewer</div>
                    <div className={styles.messageContent}>
                      <div className="spinner-border spinner-border-sm" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className={styles.chatInput}>
                <div className="d-flex gap-2 mb-2">
                  <Button
                    variant="outline-info"
                    size="sm"
                    onClick={requestHint}
                    disabled={isSending}
                  >
                    💡 Get Hint
                  </Button>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={requestFollowUp}
                    disabled={isSending}
                  >
                    ❓ Ask Follow-up
                  </Button>
                </div>
                <div className="d-flex gap-2 align-items-start">
                  <div className="flex-grow-1 position-relative">
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyPress={handleChatKeyPress}
                      placeholder="Type your message or click microphone to speak..."
                      disabled={isSending}
                      className={styles.chatTextarea}
                    />
                    {speechSupported && (
                      <button
                        type="button"
                        onClick={toggleListening}
                        disabled={isSending}
                        className={`${styles.microphoneButton} ${isListening ? styles.listening : ''}`}
                        title={isListening ? "Stop recording" : "Start voice input"}
                      >
                        {isListening ? (
                          <span className={styles.recordingIndicator}>🎤</span>
                        ) : (
                          <span>🎤</span>
                        )}
                      </button>
                    )}
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => sendMessage("message")}
                    disabled={isSending || !chatMessage.trim()}
                    className={styles.sendButton}
                  >
                    Send
                  </Button>
                </div>
                {isListening && (
                  <div className={styles.listeningIndicator}>
                    <span className={styles.listeningPulse}></span>
                    Listening... Speak now
                  </div>
                )}
              </div>
            </div>
          )}
        </Col>

        {/* Right Panel: IDE */}
        <Col md={7} className={`${styles.panel} ${styles.idePanel}`}>
            <Row>
              <Col md={6}>
                {/* Language Selector */}
                <div className="d-flex justify-left align-items-center mb-3">
                  <Form.Select
                    value={language}
                    onChange={handleLanguageChange}
                    style={{ width: '200px' }}
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="cpp">C++</option>
                    <option value="java">Java</option>
                  </Form.Select>
                </div>
              </Col>
              <Col md={6}>
                {/* Submit button under question panel */}
                <div className="d-flex justify-content-end">
                  <Button
                    variant="success"
                    size="lg"
                    onClick={handleSubmit}
                    className="px-4 py-1 rounded-full"
                    disabled={submitting}
                  >
                    {submitting ? "Evaluating..." : "Submit Solution"}
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
              tabSize: 2
            }}
          />
        </Col>
      </Row>
    </Container>
  );
}