import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { code, problem, language } = body;

  if (!code || !problem || !language) {
    return NextResponse.json(
      { error: "Missing 'code', 'problem', or 'language' in request body" },
      { status: 400 }
    );
  }

  if (!problem.tests || !Array.isArray(problem.tests)) {
    return NextResponse.json(
      { error: "Problem must have a 'tests' array" },
      { status: 400 }
    );
  }

  const results: any[] = [];
  let passedCount = 0;
  let totalTests = problem.tests.length;

  // For now, we'll support JavaScript evaluation
  // Python and other languages would require additional runtime setup
  if (language === "javascript") {
    try {
      // Execute the code in a safe context
      // The code should define a function called 'solve'
      let solveFunction;
      try {
        // Create a new function scope to execute the user's code
        const executeUserCode = new Function(`
          ${code}
          if (typeof solve === 'undefined' || typeof solve !== 'function') {
            throw new Error('solve function not found. Please define a function named solve.');
          }
          return solve;
        `);
        
        solveFunction = executeUserCode();
      } catch (evalError: any) {
        return NextResponse.json(
          {
            error: "Code compilation failed",
            message: evalError.message || "Invalid JavaScript code",
            results: [],
            passedCount: 0,
            totalTests,
          },
          { status: 400 }
        );
      }

      // Run each test case
      for (const test of problem.tests) {
        try {
          const input = test.input;
          const expected = test.expected;

          // Extract input parameters based on the problem structure
          // Handle both object and array inputs
          let inputValues: any[];
          if (Array.isArray(input)) {
            inputValues = input;
          } else if (typeof input === "object" && input !== null) {
            inputValues = Object.values(input);
          } else {
            inputValues = [input];
          }

          const result = solveFunction(...inputValues);

          // Deep equality check using JSON.stringify
          // Handle special cases for arrays/objects
          const normalize = (val: any) => {
            if (Array.isArray(val)) {
              return JSON.parse(JSON.stringify(val));
            }
            return val;
          };

          const normalizedResult = normalize(result);
          const normalizedExpected = normalize(expected);
          const passed =
            JSON.stringify(normalizedResult) ===
            JSON.stringify(normalizedExpected);

          results.push({
            description: test.description,
            input,
            expected,
            actual: result,
            passed,
            error: null,
          });

          if (passed) {
            passedCount++;
          }
        } catch (error: any) {
          results.push({
            description: test.description,
            input: test.input,
            expected: test.expected,
            actual: null,
            passed: false,
            error: error.message || "Runtime error",
          });
        }
      }
    } catch (error: any) {
      return NextResponse.json(
        {
          error: "Code execution failed",
          message: error.message,
          results: [],
          passedCount: 0,
          totalTests,
        },
        { status: 400 }
      );
    }
  } else {
    // For other languages, return a placeholder response
    // In production, you'd want to use proper code execution services
    return NextResponse.json(
      {
        error: `Language ${language} is not yet supported for evaluation`,
        results: [],
        passedCount: 0,
        totalTests,
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    results,
    passedCount,
    totalTests,
    score: Math.round((passedCount / totalTests) * 100),
  });
}

