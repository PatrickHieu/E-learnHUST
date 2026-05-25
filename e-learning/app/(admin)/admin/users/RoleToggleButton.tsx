"use client";

import { Button } from "@/components/ui/button";
import { setUserRoleAction } from "./actions";

type Props = {
  clerkUserId: string;
  currentRole: string | undefined;
};

export default function RoleToggleButton({ clerkUserId, currentRole }: Props) {
  if (currentRole === "admin") {
    return (
      <span className="text-xs text-zinc-500 font-game">
        Admin (not changeable here)
      </span>
    );
  }

  const isLibrarian = currentRole === "librarian";
  const nextRole = isLibrarian ? "student" : "librarian";

  return (
    <form action={setUserRoleAction.bind(null, clerkUserId, nextRole)}>
      <Button
        type="submit"
        variant={isLibrarian ? "outline" : "default"}
        size="sm"
        className={
          isLibrarian
            ? "bg-transparent border-zinc-700 text-red-300 hover:bg-red-900/30 font-game"
            : "font-game"
        }
        onClick={(e) => {
          if (!confirm(
            isLibrarian
              ? "Revoke Librarian access from this user?"
              : "Grant Librarian access to this user?",
          )) {
            e.preventDefault();
          }
        }}
      >
        {isLibrarian ? "Revoke Librarian" : "Make Librarian"}
      </Button>
    </form>
  );
}
