import { redirect } from "next/navigation";
import { checkRole } from "@/lib/checkRole";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const isAdmin = await checkRole("admin");

    if (!isAdmin) {
        redirect("/");
    }

    return (
        <div className="flex h-screen bg-zinc-950 text-white font-game">
            {/* Sidebar Admin */}
            <aside className="w-64 border-r border-zinc-800 p-6 flex flex-col gap-6">
                <div className="text-2xl font-bold text-yellow-400">ADMIN HUB</div>
                <nav className="flex flex-col gap-2 flex-1">
                    <Link href="/admin" className="p-3 hover:bg-zinc-900 rounded text-lg">Tổng quan</Link>
                    <Link href="/admin/courses" className="p-3 hover:bg-zinc-900 rounded text-lg">Khóa học</Link>
                </nav>

                {/* Nút User & Thoát về Dashboard */}
                <div className="border-t border-zinc-800 pt-4 flex flex-col gap-4">
                    <Link href="/dashboard" className="p-3 hover:bg-zinc-900 rounded text-lg text-zinc-500">
                        ← Về User Mode
                    </Link>
                    <div className="flex items-center gap-3 px-3">
                        <UserButton afterSignOutUrl="/" />
                        <span className="text-sm text-zinc-400">Admin Account</span>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto p-8 bg-zinc-900/50">
                {children}
            </main>
        </div>
    );
}