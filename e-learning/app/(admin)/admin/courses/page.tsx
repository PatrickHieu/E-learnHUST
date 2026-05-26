import Link from "next/link";
import { db } from "@/config/db";
import { CoursesTable } from "@/config/schema";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Edit, Plus, ListTree, Star } from "lucide-react";
import Image from "next/image";
import DeleteCourseButton from "./DeleteCourseButton";

export default async function AdminCoursesPage() {
  const courses = await db.select().from(CoursesTable);

  return (
    <div className="flex flex-col gap-6 font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Courses</h1>
          <p className="text-sm text-zinc-500 mt-1">Create and manage all course content.</p>
        </div>
        <Link href="/admin/courses/create">
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> Add Course
          </Button>
        </Link>
      </div>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Banner</TableHead>
              <TableHead>Course Name</TableHead>
              <TableHead className="text-center">Level</TableHead>
              <TableHead className="text-center">Unlock Cost</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-zinc-500 py-10">
                  No courses yet. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              courses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell>
                    <div className="w-20 h-12 relative rounded overflow-hidden bg-zinc-100 dark:bg-zinc-900">
                      <Image
                        src={course.bannerImage}
                        alt={course.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{course.title}</TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs capitalize">
                      {course.level}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center gap-1 text-sm font-medium">
                      <Star className="w-3.5 h-3.5 text-yellow-500" />
                      {course.unlockCost || 0}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/courses/${course.courseId}`}>
                        <Button variant="ghost" size="icon" title="Manage chapters & lessons">
                          <ListTree className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Link href={`/admin/courses/${course.courseId}/edit`}>
                        <Button variant="ghost" size="icon" title="Edit course">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </Link>
                      <DeleteCourseButton courseId={course.courseId} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
