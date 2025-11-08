"use client";

import React from "react";
import styles from "./welcome_screen.module.css";

const WelcomeScreen: React.FC = () => {
  return (
    <div className={styles.welcomeScreen}>
      <h1 className={styles.title}>Mock Interview App</h1>

      <input
        type="text"
        className={styles.searchBar}
        placeholder="Search for a company or topic..."
      />

      <button className={styles.startButton}>Start</button>

      <div className={styles.companyButtons}>
        <button className={styles.companyButton}>Google</button>
        <button className={styles.companyButton}>Netflix</button>
        <button className={styles.companyButton}>Amazon</button>
        <button className={styles.companyButton}>Facebook</button>
        <button className={styles.companyButton}>Microsoft</button>
      </div>
    </div>
  );
};

export default WelcomeScreen;