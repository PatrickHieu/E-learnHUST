"use server";

import { db } from "@/config/db";
import { CoursesTable } from "@/config/schema";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createCourseAction(formData: FormData) {
  const title = formData.get("title") as string;
  const desc = formData.get("desc") as string;
  const bannerImage = formData.get("bannerImage") as string;
  const level = formData.get("level") as string;
  const tags = formData.get("tags") as string;
  const editorType = formData.get("editorType") as string;
  const unlockCost = Number(formData.get("unlockCost") || 0);

  // Tạo một courseId ngẫu nhiên (hoặc bạn có thể tự thiết lập logic tăng dần)
  const courseId = Math.floor(Math.random() * 1000000);

  // 2. Lưu vào Neon Database
  await db.insert(CoursesTable).values({
    courseId,
    title,
    desc,
    bannerImage,
    level,
    tags,
    editorType,
  });

  // 3. Xóa cache của trang danh sách để nó cập nhật dữ liệu mới nhất
  revalidatePath("/admin/courses");

  // 4. Chuyển hướng người dùng về lại trang danh sách khóa học
  redirect("/admin/courses");
}
