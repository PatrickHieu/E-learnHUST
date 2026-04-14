import { db } from "@/config/db";
import { usersTable, CoursesTable } from "@/config/schema";
import { count } from "drizzle-orm";

export default async function AdminDashboard() {
    const [userCount] = await db.select({ value: count() }).from(usersTable);
    const [courseCount] = await db.select({ value: count() }).from(CoursesTable);

    return (
        <div className="font-game">
            <h1 className="text-4xl font-bold mb-8 text-white">Hệ thống quản trị</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-8 bg-zinc-900 border-2 border-zinc-800 rounded-2xl hover:border-yellow-400/50 transition-all">
                    <h3 className="text-zinc-500 text-lg mb-2 uppercase tracking-widest">Tổng khóa học</h3>
                    <p className="text-5xl font-bold text-white">{courseCount.value}</p>
                </div>

                <div className="p-8 bg-zinc-900 border-2 border-zinc-800 rounded-2xl hover:border-blue-400/50 transition-all">
                    <h3 className="text-zinc-500 text-lg mb-2 uppercase tracking-widest">Tổng học viên</h3>
                    <p className="text-5xl font-bold text-white">{userCount.value}</p>
                </div>

                <div className="p-8 bg-zinc-900 border-2 border-zinc-800 rounded-2xl hover:border-green-400/50 transition-all">
                    <h3 className="text-zinc-500 text-lg mb-2 uppercase tracking-widest">Doanh thu dự kiến</h3>
                    <p className="text-5xl font-bold text-green-400">$2,450</p>
                </div>
            </div>
        </div>
    );
}