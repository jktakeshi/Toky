"use client";
import React from "react";

const companies = ["Google", "Netflix", "Amazon", "Meta", "Microsoft"];

const WelcomeScreen: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-black dark:to-gray-900 text-gray-800 dark:text-gray-100 p-6">
      {/* Title */}
      <h1 className="text-4xl font-semibold mb-2">Mock Interview App</h1>
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-10">
        Sharpen your technical interview skills
      </p>

      {/* Search bar */}
      <div className="w-full max-w-md mb-6">
        <input
          type="text"
          placeholder="Search for a company or topic..."
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
        />
      </div>

      {/* Start button */}
      <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-full transition mb-10">
        Start Interview
      </button>

      {/* Company buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {companies.map((company) => (
          <button
            key={company}
            className="px-5 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800 transition"
          >
            {company}
          </button>
        ))}
      </div>
    </div>
  );
};

export default WelcomeScreen;