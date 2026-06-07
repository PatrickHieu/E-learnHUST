"use server";

import { db } from "@/config/db";
import { CoursesTable } from "@/config/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { hasAdminAccess } from "@/lib/checkRole";

export async function updateCourseAction(courseId: number, formData: FormData) {
  try {
    if (!(await hasAdminAccess())) {
      return { success: false, error: "Forbidden" };
    }

    const title = formData.get("title") as string;
    const desc = formData.get("desc") as string;
    const bannerImage = formData.get("bannerImage") as string;
    const level = formData.get("level") as string;
    const tags = formData.get("tags") as string;
    const editorType = formData.get("editorType") as string;
    const unlockCost = Number(formData.get("unlockCost") || 0);
    const priceVnd = Number(formData.get("priceVnd") || 0);

    // Cập nhật dữ liệu vào Neon DB
    await db
      .update(CoursesTable)
      .set({
        title,
        desc,
        bannerImage,
        level,
        tags,
        editorType,
        unlockCost,
        priceVnd,
      })
      .where(eq(CoursesTable.courseId, courseId));

    // Xóa cache để cập nhật dữ liệu mới
    revalidatePath("/admin/courses");

    // Trả về tín hiệu thành công (Không dùng redirect ở đây nữa)
    return { success: true };
  } catch (error: any) {
    console.error("Lỗi Database:", error);
    return { success: false, error: error.message };
  }
}
