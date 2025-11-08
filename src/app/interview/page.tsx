"use client";

import { useState, useEffect, useRef } from "react";
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

export default function InterviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const company = (searchParams.get("company") || "generic").toLowerCase();

  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    // TODO: send { problem, code, language } to /api/evaluate and /api/feedback
    router.push("/result");
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
        {/* Left Panel: Dynamic Question */}
        <Col
          md={5}
          className={`${styles.panel} ${styles.questionPanel}`}
        >
          <h2>{problem.title}</h2>
          <p>{problem.prompt}</p>

          {problem.constraints && (
            <p>
              <strong>Constraints:</strong> {problem.constraints}
            </p>
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
              tabSize: 2
            }}
          />
        </Col>
      </Row>
    </Container>
  );
}
