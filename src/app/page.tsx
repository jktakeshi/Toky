"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Container, Row } from "react-bootstrap";
import styles from "./home_page.module.css";

import GoogleLogo from "../../public/google.png";
import NetflixLogo from "../../public/netflix.webp";
import AmazonLogo from "../../public/amazon.png";
import FacebookLogo from "../../public/facebook.png";
import MicrosoftLogo from "../../public/microsoft.png";

const COMPANIES = [
  { name: "Google", logo: GoogleLogo },
  { name: "Netflix", logo: NetflixLogo },
  { name: "Amazon", logo: AmazonLogo },
  { name: "Facebook", logo: FacebookLogo },
  { name: "Microsoft", logo: MicrosoftLogo },
];

const WelcomeScreen: React.FC = () => {
  const router = useRouter();
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const handleStart = () => {
    const companyToStart = selectedCompany || searchQuery.trim();
    if (!companyToStart) {
      alert("Please select a company or enter a topic first.");
      return;
    }

    const companyParam = companyToStart.toLowerCase();
    router.push(`/interview?company=${encodeURIComponent(companyParam)}`);
  };

  const handleSearch = () => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) {
      alert("Please enter a company or topic to search for before pressing Enter.");
      return;
    }
    setSelectedCompany(trimmedQuery);
    setSearchQuery("");
  };

  return (
    <Container fluid className="p-0">
      <div className={styles.welcomeScreen}>
        {/* Title */}
        <Row className={styles.titleRow}>
          <h1 className={styles.title}>Toky</h1>
        </Row>

        {/* Description */}
        <Row className={styles.descRow}>
          <p className={styles.desc}>
            Welcome to Toky, an AI-powered technical interview helper. Select one of the preset companies or
            search for your own. Then click start to load into our built in IDE and hone your technical interview
            skills while getting live feedback from our AI.
          </p>
        </Row>

        {/* Search Bar */}
        <Row className={styles.searchRow}>
          <div className={styles.searchContainer}>
            <input
              type="text"
              className={styles.searchBar}
              placeholder="Search for a company or topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button onClick={handleSearch} className={styles.enterButton}>
              Enter
            </button>
          </div>
        </Row>

        <Row className={styles.buttonRow}>
          <button onClick={handleStart} className={styles.startButton}>
            Start
          </button>
        </Row>

        {/* Suggested companies */}
        <Row className={styles.companyRow}>
          <div className={styles.companyButtons}>
            {COMPANIES.map((company) => (
              <button
                key={company.name}
                onClick={() => setSelectedCompany(company.name)}
                className={`${styles.companyButton} ${
                  selectedCompany === company.name ? styles.companyButtonSelected : ""
                }`}
              >
                <span>{company.name}</span>
                {/* The 'src' will be handled by your image imports */}
                <img src={company.logo.src} alt={`${company.name} Logo`} className={styles.companyLogo} />
              </button>
            ))}
          </div>
        </Row>

      </div>
    </Container>
  );
};
export default WelcomeScreen;
