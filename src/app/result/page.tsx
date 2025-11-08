"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Container, Row, Col, Form, Button } from 'react-bootstrap';
import Editor from "@monaco-editor/react";
import styles from './page.module.css';

interface InterviewResults {
  problem: any;
  code: string;
  evalResult: any;
  feedback: string;
  solution: string;
  score: number;
  testScore: number;
  aiScore: number;
}

export default function ResultsPage() {
  const router = useRouter();
  const [results, setResults] = useState<InterviewResults | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Extract score from feedback if not provided
  const extractScoreFromFeedback = (feedback: string): number => {
    const scoreMatch = feedback.match(/SCORE:\s*(\d+)/i);
    return scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
  };

  useEffect(() => {
    // Get results from sessionStorage
    const storedResults = sessionStorage.getItem("interviewResults");
    if (storedResults) {
      try {
        const parsed = JSON.parse(storedResults);
        setResults(parsed);
      } catch (e) {
        console.error("Failed to parse results", e);
      }
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-black dark:to-gray-900 text-gray-800 dark:text-gray-100 p-6">
        <p>Loading results...</p>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-black dark:to-gray-900 text-gray-800 dark:text-gray-100 p-6">
        <h1 className="text-4xl font-semibold mb-2">No Results Found</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-10">
          Please complete an interview first
        </p>
        <button
          onClick={() => router.push("/interview")}
          className={styles.button}
        >
          Start Interview
        </button>
      </div>
    );
  }

  const { score: originalScore, feedback, solution, evalResult, code, problem } = results;
  const finalScore = originalScore || extractScoreFromFeedback(feedback) || 0;
  // Remove score from feedback if it exists
  const cleanFeedback = feedback ? feedback.replace(/SCORE:\s*\d+/gi, '').trim() : 'No feedback available.';
  
  // Detect language from code if possible (default to javascript)
  const detectLanguage = (codeStr: string): string => {
    if (!codeStr) return 'javascript';
    if (codeStr.includes('def ') || codeStr.includes('import ')) return 'python';
    if (codeStr.includes('#include') || codeStr.includes('using namespace')) return 'cpp';
    if (codeStr.includes('public class') || codeStr.includes('public static')) return 'java';
    return 'javascript';
  };
  
  const codeLanguage = detectLanguage(code);

  // Determine score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981'; // green
    if (score >= 60) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  return (
    <div className={styles.resultsPage}>
      <Container className={styles.container}>
        {/* Header with Score */}
        <div className={styles.header}>
          <h1 className={styles.title}>Interview Results</h1>
          <div className={styles.scoreContainer}>
            <div 
              className={styles.score} 
              style={{ color: getScoreColor(finalScore) }}
            >
              {finalScore}
              <span className={styles.scoreTotal}>/ 100</span>
            </div>
            {evalResult && (
              <div className={styles.testSummary}>
                <span className={styles.testPassed}>{evalResult.passedCount}</span>
                <span className={styles.testSeparator}>/</span>
                <span className={styles.testTotal}>{evalResult.totalTests}</span>
                <span className={styles.testLabel}> tests passed</span>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <Row className={styles.mainContent}>
          {/* Left Column: Feedback */}
          <Col md={6} className={styles.leftColumn}>
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Feedback</h2>
              <div className={styles.feedbackContent}>
                {cleanFeedback
                  .split(/\n\n+/)
                  .filter(p => p.trim().length > 0)
                  .map((paragraph, index) => (
                    <p key={index} className={styles.feedbackParagraph}>
                      {paragraph.trim().replace(/\n/g, ' ')}
                    </p>
                  ))}
              </div>
            </div>

            {/* Test Results */}
            {evalResult && evalResult.results && (
              <div className={styles.card}>
                <h2 className={styles.cardTitle}>Test Results</h2>
                <div className={styles.testResults}>
                  {evalResult.results.map((result: any, index: number) => (
                    <div
                      key={index}
                      className={`${styles.testResult} ${
                        result.passed ? styles.testPassed : styles.testFailed
                      }`}
                    >
                      <div className={styles.testHeader}>
                        <span className={styles.testIcon}>
                          {result.passed ? '✓' : '✗'}
                        </span>
                        <span className={styles.testDescription}>
                          {result.description}
                        </span>
                      </div>
                      {!result.passed && (
                        <div className={styles.testDetails}>
                          <div className={styles.testDetailItem}>
                            <strong>Expected:</strong> 
                            <code>{JSON.stringify(result.expected)}</code>
                          </div>
                          <div className={styles.testDetailItem}>
                            <strong>Got:</strong> 
                            <code>
                              {result.actual !== null
                                ? JSON.stringify(result.actual)
                                : result.error || 'Error'}
                            </code>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Col>

          {/* Right Column: Code Comparison */}
          <Col md={6} className={styles.rightColumn}>
            {/* Your Code */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Your Solution</h2>
              <div className={styles.codeEditor}>
                <Editor
                  height="280px"
                  language={codeLanguage}
                  value={code || '// No code submitted'}
                  theme="vs-dark"
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    automaticLayout: true,
                  }}
                />
              </div>
            </div>

            {/* Optimal Solution - Always Visible */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Optimal Solution</h2>
              <div className={styles.codeEditor}>
                <Editor
                  height="280px"
                  language={codeLanguage}
                  value={solution || '// No solution available'}
                  theme="vs-dark"
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    automaticLayout: true,
                  }}
                />
              </div>
            </div>
          </Col>
        </Row>

        {/* Navigation Buttons */}
        <div className={styles.actions}>
          <button
            onClick={() => router.push("/")}
            className={styles.actionButton}
          >
            Home
          </button>
          <button
            onClick={() => router.push("/interview")}
            className={styles.actionButton}
          >
            Practice Again
          </button>
        </div>
      </Container>
    </div>
  );
}