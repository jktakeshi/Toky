export const COMPANIES = ["google", "meta", "amazon"] as const;
export type Company = (typeof COMPANIES)[number];

export const ROLES = ["intern", "newgrad", "swe1"] as const;
export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
