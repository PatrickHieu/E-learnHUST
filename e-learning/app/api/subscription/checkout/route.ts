import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/config/db";
import { PaymentsTable, usersTable } from "@/config/schema";

// Mock checkout for the Pro subscription. Same shape as
// /api/course/purchase — records a PaymentsTable row and flips the
// learner's subscription flag. Once the real provider lands the
// route changes status='pending' on insert and lets the webhook
// promote to 'succeeded' before flipping subscription.
//
// Why amountVnd hard-coded here: pricing for the subscription itself
// isn't tracked in the courses table. 199.000₫/month is the canonical
// figure shown on /pricing — single source of truth lives here for
// the analytics chart to read.
const PRO_PRICE_VND = 199_000;

const ACCEPTED_METHODS = new Set([
  "vnpay",
  "momo",
  "card",
] as const);

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  const userEmail = session?.user?.email;
  if (!userId || !userEmail) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | { method?: string }
    | null;
  const method = String(body?.method ?? "").toLowerCase();
  if (!ACCEPTED_METHODS.has(method as typeof ACCEPTED_METHODS extends Set<infer T> ? T : never)) {
    return NextResponse.json(
      { error: "method must be one of: vnpay, momo, card" },
      { status: 400 },
    );
  }

  // Promote the user to Pro. courseId=0 is the conventional
  // "subscription, not a specific course" marker — the admin chart
  // can filter on courseId=0 to separate subscription revenue from
  // per-course sales if needed.
  await db
    .update(usersTable)
    .set({ subscription: "pro" })
    .where(eq(usersTable.email, userEmail));

  await db.insert(PaymentsTable).values({
    userId,
    courseId: 0,
    method: `mock_${method}`,
    amountVnd: PRO_PRICE_VND,
    starsSpent: null,
    status: "succeeded",
  });

  return NextResponse.json({
    success: true,
    amountVnd: PRO_PRICE_VND,
    subscription: "pro",
  });
}
