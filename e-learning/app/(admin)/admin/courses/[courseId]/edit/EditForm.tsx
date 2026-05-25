"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { UploadCloud } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateCourseAction } from "../edit/action";

export default function EditForm({ course }: { course: any }) {
    const router = useRouter();
    const [imagePreview, setImagePreview] = useState<string | null>(course.bannerImage);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setImagePreview(URL.createObjectURL(file));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);

        const formData = new FormData(e.currentTarget);
        const file = formData.get("bannerFile") as File;

        let bannerUrl = course.bannerImage;

        try {
            if (file && file.size > 0) {
                const uploadData = new FormData();
                uploadData.append("file", file);
                uploadData.append("upload_preset", "CoursesBanner");

                const cloudinaryRes = await fetch(
                    "https://api.cloudinary.com/v1_1/dxsoyupfv/image/upload",
                    { method: "POST", body: uploadData },
                );
                const cloudinaryData = await cloudinaryRes.json();
                bannerUrl = cloudinaryData.secure_url;
            }

            formData.set("bannerImage", bannerUrl);

            const result = await updateCourseAction(course.courseId, formData);
            if (result.success) {
                router.push("/admin/courses");
                router.refresh();
            } else {
                alert("Database error: " + result.error);
                setIsSubmitting(false);
            }
        } catch (error) {
            console.error("System error:", error);
            alert("Something went wrong. Check the console.");
            setIsSubmitting(false);
        }
    };

    return (
        <Card>
            <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium">Course Name *</label>
                            <Input name="title" defaultValue={course.title} required />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium">Unlock Cost (⭐)</label>
                            <Input name="unlockCost" type="number" min="0" defaultValue={course.unlockCost} />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium">Banner Image <span className="text-zinc-500 font-normal">(leave blank to keep current)</span></label>
                        <label className="cursor-pointer flex flex-col items-center justify-center h-32 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-md hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors relative overflow-hidden">
                            {imagePreview ? (
                                <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                            ) : (
                                <div className="flex flex-col items-center text-zinc-500">
                                    <UploadCloud className="w-6 h-6 mb-2" />
                                    <span className="text-sm">Upload new image</span>
                                </div>
                            )}
                            <input type="file" name="bannerFile" accept="image/*" className="hidden" onChange={handleImageChange} />
                        </label>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium">Short Description *</label>
                        <Textarea name="desc" defaultValue={course.desc} required className="h-24" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium">Difficulty</label>
                            <select
                                name="level"
                                defaultValue={course.level}
                                className="flex h-9 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                            >
                                <option value="beginner">Beginner</option>
                                <option value="intermediate">Intermediate</option>
                                <option value="advanced">Advanced</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium">Editor Type</label>
                            <select
                                name="editorType"
                                defaultValue={course.editorType}
                                className="flex h-9 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                            >
                                <option value="static">Static (HTML/CSS)</option>
                                <option value="react">React</option>
                                <option value="python">Python</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium">Tags</label>
                            <Input name="tags" defaultValue={course.tags} />
                        </div>
                    </div>

                    <div className="border-t border-zinc-200 dark:border-zinc-800 pt-5 flex justify-end gap-3">
                        <Link href="/admin/courses">
                            <Button type="button" variant="outline">Cancel</Button>
                        </Link>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Saving..." : "Update Course"}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
