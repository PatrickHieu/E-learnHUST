"use client";
import React, { useState } from "react";
import { ExternalLink } from "lucide-react";
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

// Picks the most reliable embed URL for a given source. We deliberately
// prefer a viewer that doesn't depend on the browser's native PDF
// plugin (which is patchy on mobile and blocked by some hosts via
// X-Frame-Options).
//   • Google Drive → Drive's own /preview reader (best UX for Drive)
//   • anything else → Google Docs viewer, which fetches the PDF server-
//     side and renders an iframe-friendly reader. Works for any URL
//     that is publicly fetchable.
function pickEmbedUrl(rawUrl: string): { src: string; source: "drive" | "gview" } {
  const driveId = extractGoogleDriveFileId(rawUrl);
  if (driveId) {
    return { src: `https://drive.google.com/file/d/${driveId}/preview`, source: "drive" };
  }
  return {
    src: `https://docs.google.com/gview?url=${encodeURIComponent(rawUrl)}&embedded=true`,
    source: "gview",
  };
}

function PdfLesson({ content, title }: Props) {
  const url = content?.pdfUrl;
  // Counter so the student can force a remount of the iframe if it
  // appears to have failed (e.g. Drive showing a momentary error).
  const [reloadKey, setReloadKey] = useState(0);

  if (!url) {
    return (
      <div className="w-full h-full bg-zinc-800 flex items-center justify-center p-8 text-center">
        <p className="font-game text-zinc-300 text-xl">
          This PDF lesson has no document URL set. Ask the admin to attach a PDF.
        </p>
      </div>
    );
  }

  const { src, source } = pickEmbedUrl(url);

  return (
    <div className="relative w-full h-full bg-zinc-900 flex flex-col">
      <div className="flex items-center justify-between gap-3 px-3 py-2 bg-zinc-900/80 border-b border-zinc-800 text-xs text-zinc-300">
        <span className="font-game uppercase tracking-wider text-zinc-500">
          {source === "drive" ? "Google Drive viewer" : "PDF viewer"}
        </span>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="hover:text-yellow-300 underline"
          >
            Reload
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-yellow-300 underline inline-flex items-center gap-1"
          >
            Open in new tab
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      <iframe
        key={`${source}-${reloadKey}`}
        title={title}
        src={src}
        allow="autoplay"
        className="w-full flex-1 min-h-0 bg-zinc-900"
      />
    </div>
  );
}

export default PdfLesson;
