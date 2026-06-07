import { redirect } from "next/navigation";
import { clerkClient } from "@clerk/nextjs/server";
import { checkRole } from "@/lib/checkRole";
import { db } from "@/config/db";
import { usersTable } from "@/config/schema";
import { Card } from "@/components/ui/card";
import UsersList, { type UserRow } from "./UsersList";

export default async function AdminUsersPage() {
    if (!(await checkRole("admin"))) {
        redirect("/admin");
    }

    const users = await db.select().from(usersTable);

    // Join local users with Clerk to surface each user's current role and
    // the clerkUserId needed by the role-change action.
    const client = await clerkClient();
    const clerkList = await client.users.getUserList({ limit: 500 });
    const clerkByEmail = new Map<string, { id: string; role: string }>();
    for (const cu of clerkList.data) {
        const email = cu.primaryEmailAddress?.emailAddress;
        const role = (cu.publicMetadata as { role?: string })?.role ?? "student";
        if (email) clerkByEmail.set(email, { id: cu.id, role });
    }

    const rows: UserRow[] = users.map((u) => {
        const clerk = clerkByEmail.get(u.email);
        return {
            id: u.id,
            name: u.name,
            email: u.email,
            points: u.points,
            subscription: u.subscription,
            clerkId: clerk?.id ?? null,
            role: clerk?.role ?? "student",
        };
    });

    return (
        <div className="flex flex-col gap-6 font-sans">
            <div>
                <h1 className="text-3xl font-semibold tracking-tight">Users</h1>
                <p className="text-sm text-zinc-500 mt-1">
                    All registered learners. Search by name or email, then click View for the per-user activity, completion, and payment history.
                </p>
            </div>

            <Card className="overflow-hidden p-4">
                <UsersList users={rows} />
            </Card>
        </div>
    );
}
