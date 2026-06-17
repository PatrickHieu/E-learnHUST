import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

// Judge0 proxy. We hide the RapidAPI key server-side so it never
// reaches the browser bundle. Clients POST { language, source } and
// receive { stdout, stderr, status }.
//
// Setup (one-time, by the project owner):
// 1. https://rapidapi.com/judge0-official/api/judge0-ce/ → Subscribe
//    to the Basic (free) plan. 50 submissions/day.
// 2. Copy the X-RapidAPI-Key value.
// 3. On Vercel: Project → Settings → Environment Variables → add:
//      JUDGE0_RAPIDAPI_KEY = <key>
//    (Optional override) JUDGE0_HOST = judge0-ce.p.rapidapi.com
// 4. Redeploy. Endpoint flips from 503 to working.
//
// Judge0 language IDs reference:
//   https://ce.judge0.com/languages

const JUDGE0_HOST = process.env.JUDGE0_HOST ?? "judge0-ce.p.rapidapi.com";
const JUDGE0_KEY = process.env.JUDGE0_RAPIDAPI_KEY;

const LANGUAGE_IDS: Record<string, number> = {
  c: 50,        // C (GCC 9.2.0)
  cpp: 54,      // C++ (GCC 9.2.0)
  python: 71,   // Python 3 — Pyodide handles this client-side, but the
                // endpoint accepts it as a fallback when the worker
                // fails to load.
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  if (!JUDGE0_KEY) {
    return NextResponse.json(
      {
        error: "Code execution not configured",
        hint: "Set JUDGE0_RAPIDAPI_KEY in env. See app/api/code/run/route.ts for setup steps.",
      },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => null)) as
    | { language?: string; source?: string; stdin?: string }
    | null;
  const language = String(body?.language ?? "").toLowerCase();
  const source = String(body?.source ?? "");
  const stdin = String(body?.stdin ?? "");

  const languageId = LANGUAGE_IDS[language];
  if (!languageId) {
    return NextResponse.json(
      { error: `Unsupported language: ${language}` },
      { status: 400 },
    );
  }
  if (!source) {
    return NextResponse.json({ error: "source required" }, { status: 400 });
  }

  // wait=true makes Judge0 run synchronously and return the result in
  // a single round trip. Saves us a polling loop and stays well under
  // the 10s Vercel edge timeout for typical student submissions.
  const url = `https://${JUDGE0_HOST}/submissions?base64_encoded=false&wait=true`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-RapidAPI-Host": JUDGE0_HOST,
      "X-RapidAPI-Key": JUDGE0_KEY,
    },
    body: JSON.stringify({
      language_id: languageId,
      source_code: source,
      stdin,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      {
        error: `Judge0 returned ${res.status}`,
        detail: text.slice(0, 300),
      },
      { status: 502 },
    );
  }

  const data = (await res.json()) as {
    stdout?: string | null;
    stderr?: string | null;
    compile_output?: string | null;
    message?: string | null;
    status?: { description?: string } | null;
    time?: string;
    memory?: number;
  };

  return NextResponse.json({
    stdout: data.stdout ?? "",
    stderr: data.stderr ?? data.compile_output ?? data.message ?? "",
    status: data.status?.description ?? "unknown",
    time: data.time,
    memory: data.memory,
  });
}
