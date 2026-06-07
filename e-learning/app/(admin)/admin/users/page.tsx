import { redirect } from "next/navigation";
import { checkRole } from "@/lib/checkRole";
import { db } from "@/config/db";
import { usersTable } from "@/config/schema";
import { Card } from "@/components/ui/card";
import UsersList, { type UserRow } from "./UsersList";

export default async function AdminUsersPage() {
    if (!(await checkRole("admin"))) {
        redirect("/admin");
    }

    // Role lives on usersTable.role since the Auth.js migration —
    // no second-system join needed any more.
    const users = await db.select().from(usersTable);

    const rows: UserRow[] = users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        points: u.points,
        subscription: u.subscription,
        role: u.role ?? "student",
    }));

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
