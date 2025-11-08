// src/lib/problems.ts
import problemsJson from "../data/problems.json";

export type Problem = (typeof problemsJson)[number];

export const problems: Problem[] = problemsJson;
