"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";

const RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
] as const;

// Tiny segmented control that updates ?range= on the analytics page.
// Server re-runs the aggregation queries in the new window.
function RangePicker() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("range") ?? "30";

  function pick(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", value);
    router.push(`/admin/analytics?${params.toString()}`);
  }

  return (
    <div className="inline-flex rounded-md border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      {RANGES.map((r, i) => {
        const active = current === r.value;
        return (
          <button
            key={r.value}
            type="button"
            onClick={() => pick(r.value)}
            className={`text-xs px-3 py-1.5 transition-colors ${
              i > 0 ? "border-l border-zinc-200 dark:border-zinc-800" : ""
            } ${
              active
                ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
                : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            }`}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
}

export default RangePicker;
