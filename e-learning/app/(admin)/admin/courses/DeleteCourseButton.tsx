"use client"; // Đánh dấu đây là Client Component để dùng được onClick

import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteCourseAction } from "./action";

export default function DeleteCourseButton({ courseId }: { courseId: number }) {
    return (
        <form action={deleteCourseAction.bind(null, courseId)}>
            <Button
                type="submit"
                variant="outline"
                size="icon"
                className="bg-transparent border-zinc-700 hover:bg-red-900/50"
                onClick={(e) => {
                    if (!confirm("Bạn có chắc chắn muốn xóa khóa học này không? Hành động này không thể hoàn tác!")) {
                        e.preventDefault();
                    }
                }}
            >
                <Trash2 className="w-4 h-4 text-red-400" />
            </Button>
        </form>
    );
}