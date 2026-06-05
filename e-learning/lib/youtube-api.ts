// Minimal types for the small slice of the YouTube IFrame Player API we
// actually use. Adding @types/youtube would pull in a lot more surface
// area; declaring just what we touch keeps the bundle's TypeScript
// expectations tight and visible.

export type YouTubePlayer = {
  getCurrentTime(): number;
  getDuration(): number;
  pauseVideo(): void;
  playVideo(): void;
  destroy(): void;
};

type YouTubePlayerEvent = { target: YouTubePlayer };

export type YouTubePlayerOptions = {
  videoId: string;
  width?: string | number;
  height?: string | number;
  playerVars?: Record<string, string | number>;
  events?: {
    onReady?: (event: YouTubePlayerEvent) => void;
    onStateChange?: (event: YouTubePlayerEvent & { data: number }) => void;
  };
};

type YouTubeApi = {
  Player: new (
    element: HTMLElement | string,
    options: YouTubePlayerOptions,
  ) => YouTubePlayer;
};

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiLoadPromise: Promise<YouTubeApi> | null = null;

// Returns a promise that resolves once window.YT.Player is available.
// First call injects the IFrame Player script; subsequent calls reuse
// the same promise (or resolve immediately if YT is already loaded).
export function loadYouTubeApi(): Promise<YouTubeApi> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube API is browser-only"));
  }
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiLoadPromise) return apiLoadPromise;

  apiLoadPromise = new Promise((resolve) => {
    const prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prevCallback?.();
      if (window.YT) resolve(window.YT);
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return apiLoadPromise;
}
