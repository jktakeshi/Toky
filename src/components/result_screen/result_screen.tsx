"use client";

import React, { useState } from "react";
import Link from "next/link";

const ResultScreen: React.FC = () => {
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
          onChange={(e) => setScore(Number(e.target.value))}
          className="w-full accent-blue-600 cursor-pointer"
        />
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mt-2">
          <span>❌ Fail</span>
          <span>✅ Pass</span>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-6 mt-12">
        <Link
          href="/welcome"
          className="px-6 py-2 bg-gray-200 dark:bg-gray-700 rounded-full text-gray-800 dark:text-gray-200 font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition"
        >
          Home
        </Link>

        <button
          onClick={() => setScore(0)}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-full transition"
        >
          Try Again
        </button>
      </div>
    </div>
  );
};

export default ResultScreen;