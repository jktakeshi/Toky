"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Container, Row, Col, Form, Button } from 'react-bootstrap';
import styles from './page.module.css';

export default function ResultsPage() {
  const router = useRouter();
  const [score, setScore] = useState(70); // default example score (0–100)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-black dark:to-gray-900 text-gray-800 dark:text-gray-100 p-6">
      {/* Title */}
      <h1 className="text-4xl font-semibold mb-2">Interview Result</h1>
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-10">
        Your performance summary
      </p>

      {/* Score */}
      <div className="text-6xl font-bold mb-8">
        {score} <span className="text-2xl font-normal text-gray-500">/ 100</span>
      </div>

      {/* Slider */}
      <div className="w-full max-w-md">
        <input
          type="range"
          min="0"
          max="100"
          value={score}
          className="w-full accent-blue-600"
          disabled
        /> 
      </div>

      <div className="flex justify-center space-x-4 mt-8">
        <button
              onClick={() => router.push("/")}
              className={styles.button}>
              Home
        </button>
        <button
              onClick={() => router.push("/interview")}
              className={styles.button}>
              Practice Again
        </button>
      </div>
    </div>
  );
}