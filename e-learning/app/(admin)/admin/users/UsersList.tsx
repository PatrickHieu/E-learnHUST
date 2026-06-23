"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Star, Eye } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import RoleToggleButton from "./RoleToggleButton";

const ROLE_COLOR: Record<string, string> = {
  admin:
    "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/40",
  instructor:
    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40",
  student:
    "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-700/40 dark:text-zinc-300 dark:border-zinc-600",
};

export type UserRow = {
  id: number;
  name: string;
  email: string;
  points: number | null;
  subscription: string | null;
  role: string;
};

type Props = {
  users: UserRow[];
};

function UsersList({ users }: Props) {
  const [q, setQ] = useState("");

  // Case-insensitive substring on name + email. Client-side because
  // the user list for this stage is small (typically <500); if it
  // grows we can switch to a server query without changing the page
  // shape.
  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(needle) ||
        u.email.toLowerCase().includes(needle),
    );
  }, [users, q]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or email…"
          className="pl-9"
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="text-center">Stars</TableHead>
            <TableHead className="text-center">Plan</TableHead>
            <TableHead className="text-center">Role</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-zinc-500 py-10">
                {users.length === 0 ? "No users yet." : "No users match your search."}
              </TableCell>
            </TableRow>
          ) : (
            visible.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell className="text-zinc-500">{user.email}</TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex items-center gap-1 text-sm font-medium">
                    <Star className="w-3.5 h-3.5 text-yellow-500" />
                    {user.points || 0}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={user.subscription ? "default" : "outline"}>
                    {user.subscription || "FREE"}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <span
                    className={`px-2 py-0.5 rounded text-xs uppercase border ${
                      ROLE_COLOR[user.role] ?? ROLE_COLOR.student
                    }`}
                  >
                    {user.role}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex items-center gap-2">
                    <Link href={`/admin/users/${user.id}`}>
                      <Button size="sm" variant="outline" className="gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </Button>
                    </Link>
                    <RoleToggleButton
                      userId={String(user.id)}
                      currentRole={user.role}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default UsersList;
