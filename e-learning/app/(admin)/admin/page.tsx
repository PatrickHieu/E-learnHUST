import { db } from "@/config/db";
import { usersTable, CoursesTable, EnrolledCourseTable } from "@/config/schema";
import { count } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, GraduationCap } from "lucide-react";

export default async function AdminDashboard() {
    const [[{ value: userCount }], [{ value: courseCount }], [{ value: enrollmentCount }]] = await Promise.all([
        db.select({ value: count() }).from(usersTable),
        db.select({ value: count() }).from(CoursesTable),
        db.select({ value: count() }).from(EnrolledCourseTable),
    ]);

    return (
        <div className="font-sans">
            <div className="mb-8">
                <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
                <p className="text-sm text-zinc-500 mt-1">System-wide metrics for ByteCraft.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-500">Total Courses</CardTitle>
                        <BookOpen className="w-4 h-4 text-zinc-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-semibold">{courseCount}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-500">Registered Users</CardTitle>
                        <Users className="w-4 h-4 text-zinc-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-semibold">{userCount}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-500">Active Enrollments</CardTitle>
                        <GraduationCap className="w-4 h-4 text-zinc-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-semibold">{enrollmentCount}</div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
