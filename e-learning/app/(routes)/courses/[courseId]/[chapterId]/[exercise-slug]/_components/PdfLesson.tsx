"use client";
import React from "react";
import type { PdfLessonContent } from "@/config/schema";

type Props = {
  content: PdfLessonContent;
  title: string;
};

function PdfLesson({ content, title }: Props) {
  const url = content?.pdfUrl;

  if (!url) {
    return (
      <div className="w-full h-full bg-zinc-800 flex items-center justify-center p-8 text-center">
        <p className="font-game text-zinc-300 text-xl">
          This PDF lesson has no document URL set. Ask the admin to attach a PDF.
        </p>
      </div>
    );
  }

  // <object> handles PDFs more gracefully than <iframe>: when the browser
  // or host (e.g. Cloudinary's free tier with PDF delivery disabled) blocks
  // inline rendering, the children render as the fallback so the student
  // still has a way to open the document.
  return (
    <object
      data={url}
      type="application/pdf"
      aria-label={title}
      className="w-full h-full bg-zinc-800"
    >
      <div className="w-full h-full bg-zinc-800 flex flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="font-game text-zinc-300 text-xl">
          This PDF couldn't be displayed inline.
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-game text-yellow-300 underline text-lg"
        >
          Open PDF in a new tab
        </a>
      </div>
    </object>
  );
}

export default PdfLesson;
