"use server";

import { db } from "@/config/db";
import { CoursesTable } from "@/config/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { hasAdminAccess } from "@/lib/checkRole";

export async function deleteCourseAction(courseId: number) {
  try {
    if (!(await hasAdminAccess())) {
      throw new Error("Forbidden: admin or instructor role required");
    }

    await db.delete(CoursesTable).where(eq(CoursesTable.courseId, courseId));

    revalidatePath("/admin/courses");
  } catch (error) {
    console.error("Lỗi khi xóa khóa học:", error);
    throw new Error("Không thể xóa khóa học");
  }
}
