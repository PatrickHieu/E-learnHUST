import { redirect } from "next/navigation";
import { checkRole, hasAdminAccess } from "@/lib/checkRole";
import Link from "next/link";
import { LayoutDashboard, BookOpen, Users, ArrowLeft, LineChart } from "lucide-react";
import UserAvatar from "@/app/_components/UserAvatar";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const allowed = await hasAdminAccess();
    if (!allowed) {
        redirect("/");
    }
    const isAdmin = await checkRole("admin");

    return (
        <div className="flex h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 font-sans">
            <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 p-6 flex flex-col gap-6 bg-white dark:bg-zinc-950">
                <div>
                    <div className="text-xs uppercase tracking-widest text-zinc-500">
                        {isAdmin ? "Admin" : "Librarian"}
                    </div>
                    <div className="text-xl font-semibold mt-1">Code Block</div>
                </div>

                <nav className="flex flex-col gap-1 flex-1">
                    <Link
                        href="/admin"
                        className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                    >
                        <LayoutDashboard className="w-4 h-4" />
                        Overview
                    </Link>
                    <Link
                        href="/admin/courses"
                        className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                    >
                        <BookOpen className="w-4 h-4" />
                        Courses
                    </Link>
                    {isAdmin && (
                        <Link
                            href="/admin/users"
                            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                        >
                            <Users className="w-4 h-4" />
                            Users
                        </Link>
                    )}
                    {isAdmin && (
                        <Link
                            href="/admin/analytics"
                            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                        >
                            <LineChart className="w-4 h-4" />
                            Analytics
                        </Link>
                    )}
                </nav>

                <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 flex flex-col gap-3">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2 px-3 py-2 rounded-md text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                    >
                        <ArrowLeft className="w-3 h-3" />
                        Back to User Mode
                    </Link>
                    <div className="flex items-center gap-3 px-3">
                        <UserAvatar />
                        <span className="text-xs text-zinc-500">
                            {isAdmin ? "Admin" : "Librarian"}
                        </span>
                    </div>
                </div>
            </aside>

            <main className="flex-1 overflow-y-auto p-8">
                {children}
            </main>
        </div>
    );
}
