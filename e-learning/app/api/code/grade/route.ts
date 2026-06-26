import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { eq } from "drizzle-orm";
import { db } from "@/config/db";
import { LessonsTable, type ExerciseLessonContent } from "@/config/schema";
import {
    detectGradingLanguage,
    gradeWithTestcases,
    supportsTestcaseGrading,
} from "@/lib/code-grading";

// Trial-grade endpoint. The student presses "Submit" in the runner UI,
// we compile + run their source against every published test case
// through Judge0, and return per-case pass/fail so they can iterate
// before they actually lock in completion.
//
// IMPORTANT: this endpoint never credits XP, never enrols, never
// touches the user record. It's a read-only oracle. /api/lesson/
// complete re-runs the same grader before crediting anything, so a
// caller who fakes a "pass: true" response here gains nothing.
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as
        | { lessonId?: number; source?: string; language?: string }
        | null;
    const lessonId = Number(body?.lessonId);
    const source = String(body?.source ?? "");
    if (!Number.isFinite(lessonId) || lessonId <= 0 || !source) {
        return NextResponse.json(
            { error: "lessonId and source required" },
            { status: 400 },
        );
    }

    const [lesson] = await db
        .select()
        .from(LessonsTable)
        .where(eq(LessonsTable.id, lessonId))
        .limit(1);
    if (!lesson || lesson.type !== "exercise") {
        return NextResponse.json(
            { error: "Lesson not found or not an exercise" },
            { status: 404 },
        );
    }

    const content = lesson.content as ExerciseLessonContent;
    const testcases = content.testcases ?? [];
    if (testcases.length === 0) {
        return NextResponse.json(
            { error: "This lesson has no test cases — nothing to grade." },
            { status: 400 },
        );
    }

    // Trust the client's language hint only as a fallback; the lesson's
    // starter-code keys are the source of truth so a tampered language
    // value can't reroute a Python lesson through the C compiler.
    const inferred = detectGradingLanguage(content.starterCode);
    const requested = String(body?.language ?? "").toLowerCase();
    const language = inferred ?? (supportsTestcaseGrading(requested) ? requested : "");
    if (!language) {
        return NextResponse.json(
            {
                error:
                    "Couldn't infer the grading language from this lesson — only c, cpp and python lessons are test-case graded.",
            },
            { status: 400 },
        );
    }

    const result = await gradeWithTestcases({ language, source, testcases });

    if (result.judgeNotConfigured) {
        return NextResponse.json(
            {
                error: "Code grading not configured",
                hint: "Set JUDGE0_RAPIDAPI_KEY in env. See app/api/code/run/route.ts for setup steps.",
            },
            { status: 503 },
        );
    }
    if (result.judgeError && result.passedCases === 0) {
        return NextResponse.json(
            { error: "Code grading service unreachable", detail: result.judgeError },
            { status: 502 },
        );
    }

    return NextResponse.json(result);
}
