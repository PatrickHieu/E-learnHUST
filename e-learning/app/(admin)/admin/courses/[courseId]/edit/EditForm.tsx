"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Image from "next/image";
import { UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation"; 
import { updateCourseAction } from "../edit/action";

export default function EditForm({ course }: { course: any }) {
    const router = useRouter(); // Khởi tạo router
    const [imagePreview, setImagePreview] = useState<string | null>(course.bannerImage);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImagePreview(URL.createObjectURL(file));
        }
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
                    {
                        method: "POST",
                        body: uploadData,
                    }
                );

                const cloudinaryData = await cloudinaryRes.json();
                bannerUrl = cloudinaryData.secure_url;
            }

            formData.set("bannerImage", bannerUrl);

            // Gọi Server Action và chờ kết quả
            const result = await updateCourseAction(course.courseId, formData);

            // Nếu DB lưu thành công -> Chuyển trang
            if (result.success) {
                router.push("/admin/courses");
                router.refresh(); // Ép Browser tải lại dữ liệu mới nhất
            } else {
                alert("Lỗi khi lưu Database: " + result.error);
                setIsSubmitting(false);
            }

        } catch (error) {
            console.error("Lỗi hệ thống:", error);
            alert("Đã có lỗi xảy ra! Hãy kiểm tra console.");
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="flex flex-col gap-2">
                        <label className="text-zinc-400 font-game text-sm">Tên khóa học *</label>
                        <Input name="title" defaultValue={course.title} required className="bg-zinc-950 border-zinc-800 text-white" />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-zinc-400 font-game text-sm">Giá Sao (Unlock Cost)</label>
                        <Input name="unlockCost" type="number" min="0" defaultValue={course.unlockCost} className="bg-zinc-950 border-zinc-800 text-yellow-400 font-bold" />
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-zinc-400 font-game text-sm">Ảnh Banner (Để trống nếu muốn giữ ảnh cũ)</label>
                    <div className="flex items-center gap-4">
                        <label className="flex-1 cursor-pointer flex flex-col items-center justify-center h-32 border-2 border-dashed border-zinc-700 bg-zinc-950 rounded-xl hover:border-zinc-500 transition-colors relative overflow-hidden">
                            {imagePreview ? (
                                <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                            ) : (
                                <div className="flex flex-col items-center text-zinc-500">
                                    <UploadCloud className="w-8 h-8 mb-2" />
                                    <span className="text-sm font-game">Đổi ảnh mới</span>
                                </div>
                            )}
                            <input type="file" name="bannerFile" accept="image/*" className="hidden" onChange={handleImageChange} />
                        </label>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-zinc-400 font-game text-sm">Mô tả ngắn *</label>
                    <Textarea name="desc" defaultValue={course.desc} required className="bg-zinc-950 border-zinc-800 text-white h-24" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="flex flex-col gap-2">
                        <label className="text-zinc-400 font-game text-sm">Độ khó</label>
                        <select name="level" defaultValue={course.level} className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:outline-none">
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-zinc-400 font-game text-sm">Loại Editor</label>
                        <select name="editorType" defaultValue={course.editorType} className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:outline-none">
                            <option value="static">Static (HTML/CSS)</option>
                            <option value="react">React</option>
                            <option value="python">Python</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-zinc-400 font-game text-sm">Tags</label>
                        <Input name="tags" defaultValue={course.tags} className="bg-zinc-950 border-zinc-800 text-white" />
                    </div>
                </div>

                <div className="border-t border-zinc-800 pt-5 flex justify-end">
                    <Button type="submit" variant="pixel" disabled={isSubmitting} className="w-full md:w-auto">
                        {isSubmitting ? "Đang lưu..." : "Cập nhật khóa học"}
                    </Button>
                </div>
            </form>
        </div>
    );
}