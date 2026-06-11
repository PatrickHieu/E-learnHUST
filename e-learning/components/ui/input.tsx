import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Defensive text colours: the Input wraps `bg-transparent` and
        // inherited the document `color` token. When a parent forced
        // a dark background under `<html className="dark">` but the
        // admin layout pinned `text-zinc-900` (light-mode default),
        // inputs ended up with light text on a light card — invisible.
        // Pin black-on-white explicitly so the field reads regardless
        // of the surrounding mode class.
        "text-zinc-900 dark:text-zinc-100 caret-zinc-900 dark:caret-zinc-100",
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
