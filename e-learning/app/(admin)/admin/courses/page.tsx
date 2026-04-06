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
import { Edit, Trash2, Plus } from "lucide-react";
import Image from "next/image";

export default async function AdminCoursesPage() {
  const courses = await db.select().from(CoursesTable);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold font-game text-white">Manage Courses</h1>
        <Link href="/admin/courses/create">
          <Button variant="default" className="flex gap-2">
            <Plus className="w-4 h-4" /> Add Course
          </Button>
        </Link>
      </div>

      {/* Bảng danh sách khóa học */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <Table>
          <TableHeader className="bg-zinc-950">
            <TableRow className="border-zinc-800">
              <TableHead className="text-zinc-400 font-game">Banner</TableHead>
              <TableHead className="text-zinc-400 font-game">Course Name</TableHead>
              <TableHead className="text-zinc-400 font-game text-center">Level</TableHead>
              <TableHead className="text-zinc-400 font-game text-center">Price (⭐)</TableHead>
              <TableHead className="text-zinc-400 font-game text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-zinc-500 py-10 font-game">
                  Chưa có khóa học nào. Hãy tạo mới!
                </TableCell>
              </TableRow>
            ) : (
              courses.map((course) => (
                <TableRow key={course.id} className="border-zinc-800 hover:bg-zinc-800/50">
                  <TableCell>
                    <div className="w-20 h-12 relative rounded overflow-hidden">
                      <Image 
                        src={course.bannerImage} 
                        alt={course.title} 
                        fill 
                        className="object-cover"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-white">
                    {course.title}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-300">
                      {course.level}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-yellow-400 font-bold">
                    {course.unlockCost || 0} ⭐
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="icon" className="bg-transparent border-zinc-700 hover:bg-zinc-700">
                        <Edit className="w-4 h-4 text-blue-400" />
                      </Button>
                      <Button variant="outline" size="icon" className="bg-transparent border-zinc-700 hover:bg-red-900/50">
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}