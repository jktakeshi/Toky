"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Container, Row, Col } from 'react-bootstrap';
import styles from "./home_page.module.css";

const WelcomeScreen: React.FC = () => {
  const router = useRouter();

  return (
    <div className={styles.welcomeScreen}>
      <h1 className={styles.title}>Mock Interview App</h1>

      <input
        type="text"
        className={styles.searchBar}
        placeholder="Search for a company or topic..."
      />

      <button
            onClick={() => router.push("/interview")}
            className={styles.startButton}>
            Start
      </button>

      <button
            onClick={() => router.push("/result")}
            className={styles.startButton}>
            results
      </button>

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