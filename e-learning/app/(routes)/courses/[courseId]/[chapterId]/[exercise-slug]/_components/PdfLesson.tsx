"use client";
import React, { useState } from "react";
import type { PdfLessonContent } from "@/config/schema";

type Props = {
  content: PdfLessonContent;
  title: string;
};

function PdfLesson({ content, title }: Props) {
  const url = content?.pdfUrl;
  const [useGoogleViewer, setUseGoogleViewer] = useState(true);

  if (!url) {
    return (
      <div className="w-full h-full bg-zinc-800 flex items-center justify-center p-8 text-center">
        <p className="font-game text-zinc-300 text-xl">
          This PDF lesson has no document URL set. Ask the admin to attach a PDF.
        </p>
      </div>
    );
  }

  // Strategy:
  // 1. By default, embed via Google's PDF viewer
  //    (https://docs.google.com/gview). Google's servers fetch the PDF
  //    and serve an iframe-friendly reader, which works around the most
  //    common embed failures (X-Frame-Options, MIME mismatches, etc.).
  // 2. If the admin toggles "Show native PDF" the browser tries to
  //    render the file directly via <object>.
  // 3. A persistent "Open in new tab" link is always offered as the
  //    final fallback.
  const googleViewerSrc = `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;

  return (
    <div className="relative w-full h-full bg-zinc-800 flex flex-col">
      {/* Tiny toolbar so the student can flip viewer if Google's preview
          fails for their specific PDF, and so they can always pop out. */}
      <div className="flex items-center justify-end gap-3 px-3 py-1.5 bg-zinc-900/60 text-xs text-zinc-300">
        <button
          type="button"
          onClick={() => setUseGoogleViewer((v) => !v)}
          className="hover:text-yellow-300 underline"
        >
          {useGoogleViewer ? "Switch to native viewer" : "Switch to Google viewer"}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-yellow-300 underline"
        >
          Open in new tab
        </a>
      </div>

      <div className="flex-1 min-h-0">
        {useGoogleViewer ? (
          <iframe
            key={`gview-${url}`}
            title={title}
            src={googleViewerSrc}
            className="w-full h-full bg-zinc-800"
          />
        ) : (
          <object
            data={url}
            type="application/pdf"
            aria-label={title}
            className="w-full h-full bg-zinc-800"
          >
            <div className="w-full h-full bg-zinc-800 flex flex-col items-center justify-center gap-4 p-8 text-center">
              <p className="font-game text-zinc-300 text-xl">
                The browser couldn't render this PDF inline.
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
        )}
      </div>
    </div>
  );
}

export default PdfLesson;
