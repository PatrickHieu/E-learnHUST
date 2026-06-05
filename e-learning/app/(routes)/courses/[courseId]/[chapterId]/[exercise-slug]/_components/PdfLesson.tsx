"use client";
import React from "react";
import type { PdfLessonContent } from "@/config/schema";

type Props = {
  content: PdfLessonContent;
  title: string;
};

// Extracts the file ID from common Google Drive URL shapes:
//   https://drive.google.com/file/d/{id}/view?usp=...
//   https://drive.google.com/file/d/{id}/preview
//   https://drive.google.com/open?id={id}
//   https://drive.google.com/uc?id={id}&export=download
function extractGoogleDriveFileId(url: string): string | null {
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];
  return null;
}

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

  // Google Drive: turn a /view share link into the iframe-friendly
  // /preview URL. Requires the file's sharing to be "Anyone with the
  // link can view" — otherwise the iframe shows Google's permission
  // prompt instead of the document.
  const driveId = extractGoogleDriveFileId(url);
  if (driveId) {
    const embedUrl = `https://drive.google.com/file/d/${driveId}/preview`;
    return (
      <div className="relative w-full h-full bg-zinc-800 flex flex-col">
        <div className="flex items-center justify-end gap-3 px-3 py-1.5 bg-zinc-900/60 text-xs text-zinc-300">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-yellow-300 underline"
          >
            Open in Drive
          </a>
        </div>
        <iframe
          title={title}
          src={embedUrl}
          allow="autoplay"
          className="w-full flex-1 min-h-0 bg-zinc-800"
        />
      </div>
    );
  }

  // Generic PDF URL: try a direct embed. When the browser / host blocks
  // inline rendering, the <object> children become the fallback.
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
