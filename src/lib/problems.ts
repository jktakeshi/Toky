import problemsJson from "../data/problems.json";

export type Problem = (typeof problemsJson)["problems"][number];
export const problems: Problem[] = problemsJson.problems;
