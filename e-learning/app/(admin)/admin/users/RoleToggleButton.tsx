"use client";

import { Button } from "@/components/ui/button";
import { setUserRoleAction } from "./actions";

type Props = {
  userId: string;
  currentRole: string | undefined;
};

export default function RoleToggleButton({ userId, currentRole }: Props) {
  if (currentRole === "admin") {
    return (
      <span className="text-xs text-zinc-500">
        Admin (not changeable here)
      </span>
    );
  }

  const isInstructor = currentRole === "instructor";
  const nextRole = isInstructor ? "student" : "instructor";

  return (
    <form action={setUserRoleAction.bind(null, userId, nextRole)}>
      <Button
        type="submit"
        variant={isInstructor ? "outline" : "default"}
        size="sm"
        className={
          isInstructor
            ? "text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
            : ""
        }
        onClick={(e) => {
          if (!confirm(
            isInstructor
              ? "Revoke Instructor access from this user?"
              : "Grant Instructor access to this user?",
          )) {
            e.preventDefault();
          }
        }}
      >
        {isInstructor ? "Revoke Instructor" : "Make Instructor"}
      </Button>
    </form>
  );
}
