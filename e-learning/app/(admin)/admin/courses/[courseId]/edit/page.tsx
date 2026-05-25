import Link from "next/link";
import { Button } from "@/components/ui/button";
import { db } from "@/config/db";
import { CoursesTable } from "@/config/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import EditForm from "./EditForm";

export default async function EditCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
    const resolvedParams = await params;
    const courseId = parseInt(resolvedParams.courseId);
    if (isNaN(courseId)) redirect("/admin/courses");

    const courseData = await db.select().from(CoursesTable).where(eq(CoursesTable.courseId, courseId));
    if (!courseData || courseData.length === 0) redirect("/admin/courses");

    const course = courseData[0];

    return (
        <div className="max-w-3xl mx-auto flex flex-col gap-6 font-sans">
            <div className="flex items-center gap-3">
                <Link href="/admin/courses">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                </Link>
                <h1 className="text-2xl font-semibold tracking-tight">
                    Edit <span className="text-blue-500">{course.title}</span>
                </h1>
            </div>

            <EditForm course={course} />
        </div>
    );
}
