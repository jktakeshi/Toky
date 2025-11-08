'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Row, Col, Form, Button } from 'react-bootstrap';
import Editor from '@monaco-editor/react';
import styles from './page.module.css';

export default function InterviewPage() {
  const router = useRouter();

  // Code state
  const [code, setCode] = useState<string>('function solve() {\n  // your code here\n}');
  const [language, setLanguage] = useState<string>('javascript');

  // Default templates per language
  const templates: Record<string, string> = {
    javascript: 'function solve() {\n  // your code here\n}',
    python: 'def solve():\n    # your code here\n    pass',
    cpp: '#include <bits/stdc++.h>\nusing namespace std;\n\nvoid solve() {\n    // your code here\n}\n\nint main() {\n    solve();\n    return 0;\n}',
    java: 'public class Solution {\n    public static void solve() {\n        // your code here\n    }\n}',
  };

  const handleEditorChange = (value: string | undefined) => {
    setCode(value || '');
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    setCode(templates[newLang]);
  };

  // Handle Submit: navigate to /result page 
  const handleSubmit = () => {
    router.push('/result');
  };

  return (
    <Container fluid className={styles.container}>
      <Row className="vh-100">
        {/* Left Panel: The Question */}
        <Col md={5} className={`${styles.panel} ${styles.questionPanel}`}>
          <h2>Question: Two Sum</h2>
          <p>
            Given an array of integers <code>nums</code> and an integer <code>target</code>, 
            return indices of the two numbers such that they add up to <code>target</code>.
          </p>
          <p>
            You may assume that each input would have <strong>exactly one solution</strong>, 
            and you may not use the same element twice.
          </p>
          <p>You can return the answer in any order.</p>
  
          <h3>Example:</h3>
          <pre>
{`Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].`}
          </pre>
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

          {/* Monaco Editor */}
          <Editor
            height="90%"
            language={language}
            value={code}
            onChange={handleEditorChange}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
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