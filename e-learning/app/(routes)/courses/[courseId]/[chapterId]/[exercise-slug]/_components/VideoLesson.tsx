"use client";
import React from "react";
import type { VideoLessonContent } from "@/config/schema";

type Props = {
  content: VideoLessonContent;
  title: string;
};

function youtubeIdFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1);
    if (u.hostname.endsWith("youtube.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      if (u.pathname.startsWith("/embed/")) return u.pathname.split("/")[2];
    }
    return null;
  } catch {
    return null;
  }
}

function vimeoIdFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith("vimeo.com")) return null;
    const id = u.pathname.split("/").filter(Boolean).pop();
    return id && /^\d+$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

function VideoLesson({ content, title }: Props) {
  const { provider, url } = content;

  if (provider === "youtube") {
    const id = youtubeIdFromUrl(url);
    if (!id) return <UnplayableVideo url={url} />;
    return (
      <iframe
        title={title}
        src={`https://www.youtube.com/embed/${id}`}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  if (provider === "vimeo") {
    const id = vimeoIdFromUrl(url);
    if (!id) return <UnplayableVideo url={url} />;
    return (
      <iframe
        title={title}
        src={`https://player.vimeo.com/video/${id}`}
        className="w-full h-full"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    );
  }

  // native: direct video file URL (e.g. Cloudinary video delivery)
  return (
    <video
      controls
      className="w-full h-full bg-black"
      src={url}
      aria-label={title}
    />
  );
}

function UnplayableVideo({ url }: { url: string }) {
  return (
    <div className="p-10 font-game text-xl text-zinc-300">
      Couldn't parse this video URL — open it directly:{" "}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-yellow-400 underline"
      >
        {url}
      </a>
    </div>
  );
}

export default VideoLesson;
