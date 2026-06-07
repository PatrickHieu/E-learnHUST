"use client";

import { signOut, useSession } from "next-auth/react";
import { LogOut, User as UserIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Cleanroom replacement for Clerk's <UserButton>. Shows an initial
// avatar, opens a small dropdown with the user's identity, role, and
// a Sign out item. Account-management (rename, change password) is
// deferred to a future settings page — keeps the dropdown narrow.
function UserAvatar() {
  const { data: session } = useSession();
  const user = session?.user;

  if (!user) return null;

  const initial = (user.name?.[0] ?? user.email?.[0] ?? "?").toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center hover:bg-emerald-500 transition-colors"
          aria-label="Open user menu"
        >
          {initial}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-1">
          <span className="font-semibold">{user.name ?? "Learner"}</span>
          <span className="text-xs text-zinc-500 truncate">{user.email}</span>
          {user.role && user.role !== "student" && (
            <span className="text-[10px] uppercase tracking-wider mt-1 text-yellow-600">
              {user.role}
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled className="gap-2">
          <UserIcon className="w-4 h-4" />
          Manage account
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: "/" })}
          className="gap-2 text-red-600 focus:text-red-600"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default UserAvatar;
