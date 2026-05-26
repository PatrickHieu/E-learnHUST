import { redirect } from "next/navigation";
import { clerkClient } from "@clerk/nextjs/server";
import { checkRole } from "@/lib/checkRole";
import { db } from "@/config/db";
import { usersTable } from "@/config/schema";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Star } from "lucide-react";
import RoleToggleButton from "./RoleToggleButton";

const ROLE_COLOR: Record<string, string> = {
    admin: "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/40",
    librarian: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40",
    student: "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-700/40 dark:text-zinc-300 dark:border-zinc-600",
};

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

    return (
        <div className="flex flex-col gap-6 font-sans">
            <div>
                <h1 className="text-3xl font-semibold tracking-tight">Users</h1>
                <p className="text-sm text-zinc-500 mt-1">All registered learners, their account status, and access role.</p>
            </div>

            <Card className="overflow-hidden p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead className="text-center">Stars</TableHead>
                            <TableHead className="text-center">Plan</TableHead>
                            <TableHead className="text-center">Role</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-zinc-500 py-10">
                                    No users yet.
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map((user) => {
                                const clerk = clerkByEmail.get(user.email);
                                const role = clerk?.role ?? "student";
                                return (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.name}</TableCell>
                                        <TableCell className="text-zinc-500">{user.email}</TableCell>
                                        <TableCell className="text-center">
                                            <span className="inline-flex items-center gap-1 text-sm font-medium">
                                                <Star className="w-3.5 h-3.5 text-yellow-500" />
                                                {user.points || 0}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={user.subscription ? "default" : "outline"}>
                                                {user.subscription || "FREE"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className={`px-2 py-0.5 rounded text-xs uppercase border ${ROLE_COLOR[role] ?? ROLE_COLOR.student}`}>
                                                {role}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {clerk ? (
                                                <RoleToggleButton clerkUserId={clerk.id} currentRole={role} />
                                            ) : (
                                                <span className="text-xs text-zinc-500">No Clerk account</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
