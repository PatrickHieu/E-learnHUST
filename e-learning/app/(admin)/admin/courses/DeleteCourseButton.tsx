"use client";

import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteCourseAction } from "./action";

export default function DeleteCourseButton({ courseId }: { courseId: number }) {
    return (
        <form action={deleteCourseAction.bind(null, courseId)}>
            <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                title="Delete course"
                onClick={(e) => {
                    if (!confirm("Delete this course permanently? This cannot be undone.")) {
                        e.preventDefault();
                    }
                }}
            >
                <Trash2 className="w-4 h-4" />
            </Button>
        </form>
    );
}
