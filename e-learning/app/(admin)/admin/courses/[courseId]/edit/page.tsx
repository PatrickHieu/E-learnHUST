import Link from "next/link";
import { Button } from "@/components/ui/button";
import { db } from "@/config/db";
import { CoursesTable } from "@/config/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import EditForm from "./EditForm";

export default async function EditCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
    // Lấy ID từ URL (Trong Next 15/16, params là một Promise)
    const resolvedParams = await params;
    const courseId = parseInt(resolvedParams.courseId);

    if (isNaN(courseId)) {
        redirect("/admin/courses");
    }

    // Fetch dữ liệu khóa học từ Database
    const courseData = await db.select().from(CoursesTable).where(eq(CoursesTable.courseId, courseId));

    // Nếu nhập ID vớ vẩn trên URL, đá về trang danh sách
    if (!courseData || courseData.length === 0) {
        redirect("/admin/courses");
    }

    const course = courseData[0];

    return (
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <Link href="/admin/courses">
                    <Button variant="outline" className="bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                        ← Quay lại
                    </Button>
                </Link>
                <h1 className="text-3xl font-bold font-game text-white">
                    Sửa: <span className="text-blue-400">{course.title}</span>
                </h1>
            </div>

            {/* Gọi Client Component form và truyền dữ liệu vào */}
            <EditForm course={course} />
        </div>
    );
}