"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./home_page.module.css";

const COMPANIES = ["Google", "Netflix", "Amazon", "Facebook", "Microsoft"];

const WelcomeScreen: React.FC = () => {
  const router = useRouter();
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);

  const handleStart = () => {
    if (!selectedCompany) {
      alert("Please select a company first.");
      return;
    }

    const companyParam = selectedCompany.toLowerCase();
    // Pass company to /interview, which will call /api/problems
    router.push(`/interview?company=${encodeURIComponent(companyParam)}`);
  };

  return (
    <div className={styles.welcomeScreen}>
      <h1 className={styles.title}>Mock Interview App</h1>

      <input
        type="text"
        className={styles.searchBar}
        placeholder="Search for a company or topic..."
      />

      <button onClick={handleStart} className={styles.startButton}>
        Start
      </button>

      <div className={styles.companyButtons}>
        {COMPANIES.map((company) => (
          <button
            key={company}
            onClick={() => setSelectedCompany(company)}
            className={`${styles.companyButton} ${
              selectedCompany === company ? styles.companyButtonSelected : ""
            }`}
          >
            {company}
          </button>
        ))}
      </div>
    </div>
  );
};

export default WelcomeScreen;
