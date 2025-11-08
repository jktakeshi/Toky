'use client';

import { useState } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import Editor from '@monaco-editor/react';
import styles from './page.module.css';

export default function InterviewPage() {
  // State to hold the code from the IDE
  const [code, setCode] = useState<string>('function solve() {\n  // your code here\n}');

  const handleEditorChange = (value: string | undefined) => {
    setCode(value || '');
  };

  return (
    <Container fluid className={styles.container}>
      <Row className="vh-100">
        {/* Left Panel: The Question */}
        <Col md={5} className={`${styles.panel} ${styles.questionPanel}`}>
          <h2>Question: Two Sum</h2>
          <p>
            Given an array of integers `nums` and an integer `target`, 
            return indices of the two numbers such that they add up to `target`.
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
  
        {/* Right Panel: Monaco Editor IDE */}
        <Col md={7} className={`${styles.panel} ${styles.idePanel}`}>
          <Editor
            height="100%"
            defaultLanguage="javascript"
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