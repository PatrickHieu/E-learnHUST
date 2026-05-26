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
      <span className="text-xs text-zinc-500">
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
            ? "text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
            : ""
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
