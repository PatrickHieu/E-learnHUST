"use server";

import { db } from "@/config/db";
import { CoursesTable } from "@/config/schema";
import { max } from "drizzle-orm";
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

  // Monotonic courseId: MAX(courseId) + 1. The previous Math.random() approach
  // would eventually collide with the UNIQUE constraint.
  const [{ value: currentMax }] = await db
    .select({ value: max(CoursesTable.courseId) })
    .from(CoursesTable);
  const courseId = (currentMax ?? 0) + 1;

  await db.insert(CoursesTable).values({
    courseId,
    title,
    desc,
    bannerImage,
    level,
    tags,
    editorType,
    unlockCost,
  });

  revalidatePath("/admin/courses");
  redirect("/admin/courses");
}
