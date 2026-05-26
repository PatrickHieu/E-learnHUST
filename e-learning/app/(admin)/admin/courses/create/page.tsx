"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { createCourseAction } from "./actions";
import Image from "next/image";
import { UploadCloud, ArrowLeft } from "lucide-react";

export default function CreateCoursePage() {
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        setImagePreview(file ? URL.createObjectURL(file) : null);
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
                    { method: "POST", body: uploadData },
                );
                const cloudinaryData = await cloudinaryRes.json();
                bannerUrl = cloudinaryData.secure_url;
            }

            formData.set("bannerImage", bannerUrl);
            await createCourseAction(formData);
        } catch (error) {
            console.error("Upload error:", error);
            alert("Something went wrong while uploading the image.");
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto flex flex-col gap-6 font-sans">
            <div className="flex items-center gap-3">
                <Link href="/admin/courses">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Create New Course</h1>
                    <p className="text-sm text-zinc-500 mt-1">Set up the course shell — chapters and lessons come next.</p>
                </div>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium">Course Name *</label>
                                <Input name="title" required placeholder="e.g. ReactJS Fundamentals" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium">Unlock Cost (⭐)</label>
                                <Input name="unlockCost" type="number" min="0" defaultValue="0" />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium">Banner Image *</label>
                            <label className="cursor-pointer flex flex-col items-center justify-center h-32 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-md hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors relative overflow-hidden">
                                {imagePreview ? (
                                    <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center text-zinc-500">
                                        <UploadCloud className="w-6 h-6 mb-2" />
                                        <span className="text-sm">Click to upload from your device</span>
                                    </div>
                                )}
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

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium">Short Description *</label>
                            <Textarea name="desc" required placeholder="This course will help you..." className="h-24" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium">Level</label>
                                <select
                                    name="level"
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
                                    className="flex h-9 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                                >
                                    <option value="static">Static (HTML/CSS)</option>
                                    <option value="react">React</option>
                                    <option value="python">Python</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium">Tags</label>
                                <Input name="tags" placeholder="web, frontend" />
                            </div>
                        </div>

                        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-5 flex justify-end gap-3">
                            <Link href="/admin/courses">
                                <Button type="button" variant="outline">Cancel</Button>
                            </Link>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Uploading & Saving..." : "Save Course"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
