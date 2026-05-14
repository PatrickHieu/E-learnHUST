"use client";
import React from "react";
import type { PdfLessonContent } from "@/config/schema";

type Props = {
  content: PdfLessonContent;
  title: string;
};

function PdfLesson({ content, title }: Props) {
  return (
    <iframe
      title={title}
      src={content.pdfUrl}
      className="w-full h-full bg-zinc-800"
    />
  );
}

export default PdfLesson;
