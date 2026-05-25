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
import RoleToggleButton from "./RoleToggleButton";

const ROLE_COLOR: Record<string, string> = {
    admin: "bg-red-500/20 text-red-300 border-red-500/40",
    librarian: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    student: "bg-zinc-700/40 text-zinc-300 border-zinc-600",
};

export default async function AdminUsersPage() {
    if (!(await checkRole("admin"))) {
        redirect("/admin");
    }

    const users = await db.select().from(usersTable);

    // Fetch Clerk users to enrich the local rows with their current role
    // and clerkUserId (needed for the role-change call).
    const client = await clerkClient();
    const clerkList = await client.users.getUserList({ limit: 500 });
    const clerkByEmail = new Map<string, { id: string; role: string }>();
    for (const cu of clerkList.data) {
        const email = cu.primaryEmailAddress?.emailAddress;
        const role = (cu.publicMetadata as { role?: string })?.role ?? "student";
        if (email) clerkByEmail.set(email, { id: cu.id, role });
    }

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-3xl font-bold font-game text-white">Quản lý Học viên</h1>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
                <Table>
                    <TableHeader className="bg-zinc-950">
                        <TableRow className="border-zinc-800">
                            <TableHead className="text-zinc-400 font-game">Tên học viên</TableHead>
                            <TableHead className="text-zinc-400 font-game">Email</TableHead>
                            <TableHead className="text-zinc-400 font-game text-center">Sao tích lũy (⭐)</TableHead>
                            <TableHead className="text-zinc-400 font-game text-center">Gói tài khoản</TableHead>
                            <TableHead className="text-zinc-400 font-game text-center">Role</TableHead>
                            <TableHead className="text-zinc-400 font-game text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user) => {
                            const clerk = clerkByEmail.get(user.email);
                            const role = clerk?.role ?? "student";
                            return (
                                <TableRow key={user.id} className="border-zinc-800">
                                    <TableCell className="text-white font-medium">{user.name}</TableCell>
                                    <TableCell className="text-zinc-400">{user.email}</TableCell>
                                    <TableCell className="text-center text-yellow-400 font-bold">
                                        {user.points || 0} ⭐
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant={user.subscription ? "default" : "outline"} className="font-game">
                                            {user.subscription || "FREE"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className={`font-game px-3 py-1 rounded text-xs uppercase border ${ROLE_COLOR[role] ?? ROLE_COLOR.student}`}>
                                            {role}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {clerk ? (
                                            <RoleToggleButton clerkUserId={clerk.id} currentRole={role} />
                                        ) : (
                                            <span className="text-xs text-zinc-600 font-game">
                                                No Clerk account
                                            </span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
