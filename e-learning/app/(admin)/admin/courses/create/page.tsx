"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createCourseAction } from "./actions";
import Image from "next/image";
import { UploadCloud } from "lucide-react";

export default function CreateCoursePage() {
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Xử lý khi người dùng chọn ảnh
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImagePreview(URL.createObjectURL(file));
        } else {
            setImagePreview(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);

        const formData = new FormData(e.currentTarget);
        const file = formData.get("bannerFile") as File;

        let bannerUrl = "";

        try {
            if (file && file.size > 0) {
                const uploadData = new FormData();
                uploadData.append("file", file);

                uploadData.append("upload_preset", "CoursesBanner");

                const cloudinaryRes = await fetch(
                    "https://api.cloudinary.com/v1_1/dxsoyupfv/image/upload",
                    {
                        method: "POST",
                        body: uploadData,
                    }
                );

                const cloudinaryData = await cloudinaryRes.json();
                bannerUrl = cloudinaryData.secure_url; 
            }

            formData.set("bannerImage", bannerUrl);

            await createCourseAction(formData);

        } catch (error) {
            console.error("Lỗi upload:", error);
            alert("Đã có lỗi xảy ra khi tải ảnh lên!");
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <Link href="/admin/courses">
                    <Button variant="outline" className="bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                        ←
                    </Button>
                </Link>
                <h1 className="text-3xl font-bold font-game text-white">Create New Course</h1>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="flex flex-col gap-2">
                            <label className="text-zinc-400 font-game text-sm">Course Name *</label>
                            <Input name="title" required placeholder="VD: ReactJS Căn Bản" className="bg-zinc-950 border-zinc-800 text-white" />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-zinc-400 font-game text-sm">Unlock Cost</label>
                            <Input name="unlockCost" type="number" min="0" defaultValue="0" className="bg-zinc-950 border-zinc-800 text-yellow-400 font-bold" />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-zinc-400 font-game text-sm">Banner Image *</label>
                        <div className="flex items-center gap-4">
                            <label className="flex-1 cursor-pointer flex flex-col items-center justify-center h-32 border-2 border-dashed border-zinc-700 bg-zinc-950 rounded-xl hover:border-zinc-500 transition-colors relative overflow-hidden">
                                {imagePreview ? (
                                    <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center text-zinc-500">
                                        <UploadCloud className="w-8 h-8 mb-2" />
                                        <span className="text-sm font-game">Click to select image from your device</span>
                                    </div>
                                )}
                                {/* Input file ẩn đi */}
                                <input
                                    type="file"
                                    name="bannerFile"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageChange}
                                    required
                                />
                            </label>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-zinc-400 font-game text-sm">Short Description *</label>
                        <Textarea name="desc" required placeholder="This course will help you..." className="bg-zinc-950 border-zinc-800 text-white h-24" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="flex flex-col gap-2">
                            <label className="text-zinc-400 font-game text-sm">Level</label>
                            <select name="level" className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:outline-none">
                                <option value="beginner">Beginner</option>
                                <option value="intermediate">Intermediate</option>
                                <option value="advanced">Advanced</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-zinc-400 font-game text-sm">Editor Type</label>
                            <select name="editorType" className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:outline-none">
                                <option value="static">Static (HTML/CSS)</option>
                                <option value="react">React</option>
                                <option value="python">Python</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-zinc-400 font-game text-sm">Tags</label>
                            <Input name="tags" placeholder="VD: web, frontend" className="bg-zinc-950 border-zinc-800 text-white" />
                        </div>
                    </div>

                    <div className="border-t border-zinc-800 pt-5 flex justify-end">
                        <Button
                            type="submit"
                            variant="pixel"
                            disabled={isSubmitting}
                            className="w-full md:w-auto"
                        >
                            {isSubmitting ? "Uploading & Saving..." : "Save Course"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}