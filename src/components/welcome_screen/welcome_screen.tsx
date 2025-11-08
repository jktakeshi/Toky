"use client";

import React from "react";
import "./welcome_screen.css"; // match the actual file name (lowercase)

const WelcomeScreen: React.FC = () => {
  return (
    <div className="welcome-screen">
      <h1 className="title">Mock Interview App</h1>

      <input
        type="text"
        className="search-bar"
        placeholder="Search for a company or topic..."
      />

      <button className="start-button">Start</button>

      <div className="company-buttons">
        <button className="company-button">Google</button>
        <button className="company-button">Netflix</button>
        <button className="company-button">Amazon</button>
        <button className="company-button">Facebook</button>
        <button className="company-button">Microsoft</button>
      </div>
    </div>
  );
};

export default WelcomeScreen;