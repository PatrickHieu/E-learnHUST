import type { ExerciseTestCase } from "@/config/schema";

// Server-side test-case grader. Runs a student submission against
// every test case through Judge0's sandboxed runner and reports
// per-case pass/fail. This is the only place that decides "did the
// program produce the expected output" — clients never get a vote.
//
// Pipeline:
//   1. POST one Judge0 submission per test case with stdin = case.input
//      and the same cpu / wall / memory caps the /api/code/run route
//      uses (see app/api/code/run/route.ts for tuning env vars).
//   2. Wait for each result synchronously (?wait=true) so a single
//      Vercel edge invocation handles the whole grade pass.
//   3. Normalise both stdout and expectedOutput (trim trailing
//      whitespace per line, drop trailing blank lines, CRLF -> LF)
//      before comparing — most teaching exercises don't care about
//      "trailing newline yes/no".
//   4. Return a structured result so the API route can both gate XP
//      and surface a UI-friendly per-case list to the student.
//
// Hidden cases stay hidden: the public result strips `input` and
// `expectedOutput` so the page never leaks them.

export type GradingCaseResult = {
    name: string;
    passed: boolean;
    hidden: boolean;
    status: string;        // Judge0 status description ("Accepted", "Time Limit Exceeded", …)
    time?: string;         // seconds, as Judge0 reports
    memoryKb?: number;
    // Diff payload — only filled for visible cases on failure.
    input?: string;
    expected?: string;
    actual?: string;
    stderr?: string;
};

export type GradingResult = {
    pass: boolean;
    totalCases: number;
    passedCases: number;
    results: GradingCaseResult[];
    // True iff the operator hasn't set JUDGE0_RAPIDAPI_KEY. The caller
    // turns this into a 503 with the same hint the run route surfaces.
    judgeNotConfigured?: boolean;
    // True iff none of the test cases ran for a non-config reason
    // (e.g. Judge0 returned 5xx). The caller flags this as a 502.
    judgeError?: string;
};

const JUDGE0_HOST = process.env.JUDGE0_HOST ?? "judge0-ce.p.rapidapi.com";

const LANGUAGE_IDS: Record<string, number> = {
    c: 50,
    cpp: 54,
    python: 71,
};

export function supportsTestcaseGrading(language: string): boolean {
    return Object.prototype.hasOwnProperty.call(LANGUAGE_IDS, language);
}

// Treat "hello\n" and "hello" as the same answer. Also collapses
// CRLF and trims trailing whitespace on each line. We don't trim
// internal whitespace because alignment can matter (think pretty-
// printed tables in a teaching exercise).
function normaliseOutput(s: string): string {
    return s
        .replace(/\r\n/g, "\n")
        .split("\n")
        .map((line) => line.replace(/[\t ]+$/g, ""))
        .join("\n")
        .replace(/\n+$/g, "");
}

type Judge0Response = {
    stdout?: string | null;
    stderr?: string | null;
    compile_output?: string | null;
    message?: string | null;
    status?: { description?: string } | null;
    time?: string;
    memory?: number;
};

async function runOneCase(
    languageId: number,
    source: string,
    stdin: string,
    apiKey: string,
    limits: { cpu: number; wall: number; memKb: number },
): Promise<Judge0Response | { error: string }> {
    const url = `https://${JUDGE0_HOST}/submissions?base64_encoded=false&wait=true`;
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            "X-RapidAPI-Host": JUDGE0_HOST,
            "X-RapidAPI-Key": apiKey,
        },
        body: JSON.stringify({
            language_id: languageId,
            source_code: source,
            stdin,
            cpu_time_limit: limits.cpu,
            wall_time_limit: limits.wall,
            memory_limit: limits.memKb,
            stack_limit: 64_000,
            max_processes_and_or_threads: 16,
            enable_per_process_and_thread_time_limit: false,
            enable_per_process_and_thread_memory_limit: false,
        }),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        return { error: `Judge0 ${res.status}: ${text.slice(0, 200)}` };
    }
    return (await res.json()) as Judge0Response;
}

export async function gradeWithTestcases(args: {
    language: string;
    source: string;
    testcases: ExerciseTestCase[];
}): Promise<GradingResult> {
    const { language, source, testcases } = args;
    const languageId = LANGUAGE_IDS[language];
    if (!languageId) {
        return {
            pass: false,
            totalCases: testcases.length,
            passedCases: 0,
            results: [],
            judgeError: `Unsupported language for test-case grading: ${language}`,
        };
    }

    const apiKey = process.env.JUDGE0_RAPIDAPI_KEY;
    if (!apiKey) {
        return {
            pass: false,
            totalCases: testcases.length,
            passedCases: 0,
            results: [],
            judgeNotConfigured: true,
        };
    }

    const limits = {
        cpu: Number(process.env.JUDGE0_CPU_TIME ?? 5),
        wall: Number(process.env.JUDGE0_WALL_TIME ?? 8),
        memKb: Number(process.env.JUDGE0_MEMORY_KB ?? 256_000),
    };

    // Sequential runs keep us inside the free-tier rate limit (50/day,
    // a few QPS burst). For lessons with a lot of cases an admin can
    // tune the per-call time budget down via env.
    const results: GradingCaseResult[] = [];
    let passedCases = 0;
    let judgeError: string | undefined;

    for (let i = 0; i < testcases.length; i++) {
        const t = testcases[i];
        const name = t.name?.trim() || `Test ${i + 1}`;
        const hidden = Boolean(t.hidden);
        const run = await runOneCase(languageId, source, t.input ?? "", apiKey, limits);

        if ("error" in run) {
            judgeError = judgeError ?? run.error;
            results.push({
                name,
                passed: false,
                hidden,
                status: "Judge unreachable",
                stderr: hidden ? undefined : run.error,
            });
            continue;
        }

        const stdout = run.stdout ?? "";
        const stderr = run.stderr ?? run.compile_output ?? run.message ?? "";
        const status = run.status?.description ?? "unknown";
        const expectedNorm = normaliseOutput(t.expectedOutput ?? "");
        const actualNorm = normaliseOutput(stdout);
        const passed = status === "Accepted" && actualNorm === expectedNorm;

        if (passed) passedCases++;

        results.push({
            name,
            passed,
            hidden,
            status,
            time: run.time,
            memoryKb: run.memory,
            // Only leak diff payload for visible cases. Hidden cases
            // never expose input / expected / actual to the client.
            input: hidden ? undefined : t.input,
            expected: hidden ? undefined : t.expectedOutput,
            actual: hidden ? undefined : stdout,
            stderr: hidden ? undefined : stderr,
        });
    }

    return {
        pass: testcases.length > 0 && passedCases === testcases.length,
        totalCases: testcases.length,
        passedCases,
        results,
        judgeError,
    };
}

// Picks the language identifier for grading from the lesson's
// starterCode key (we already follow that convention everywhere).
// Returns null for HTML/CSS/JS bundles, which keep the legacy
// regex validator.
export function detectGradingLanguage(
    starterCode: Record<string, string>,
): "c" | "cpp" | "python" | null {
    const keys = Object.keys(starterCode);
    if (keys.some((k) => k.endsWith(".py"))) return "python";
    if (keys.some((k) => k.endsWith(".cpp") || k.endsWith(".cxx") || k.endsWith(".cc"))) return "cpp";
    if (keys.some((k) => k.endsWith(".c"))) return "c";
    return null;
}
