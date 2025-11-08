// src/app/api/problem/route.ts
import { NextRequest, NextResponse } from "next/server";
import { problems } from "@/lib/problems";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");          // "intern" | "newgrad" | "swe1"
  const company = searchParams.get("company");    // "google" | "meta" | "amazon"
  const difficulty = searchParams.get("difficulty"); // "easy" | "medium" | "hard"

  let filtered = problems;

  if (role) {
    filtered = filtered.filter(p => p.roles?.includes(role));
  }
  if (company) {
    filtered = filtered.filter(p => p.companyStyle?.includes(company));
  }
  if (difficulty) {
    filtered = filtered.filter(p => p.difficulty === difficulty);
  }

  if (filtered.length === 0) {
    return NextResponse.json({ error: "No matching problem" }, { status: 404 });
  }

  const problem = filtered[Math.floor(Math.random() * filtered.length)];
  return NextResponse.json(problem);
}
