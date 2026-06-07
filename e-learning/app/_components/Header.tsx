"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import { Shield } from "lucide-react";

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

function Header() {
  const { user } = useUser();
  const params = useParams();

  // Clerk stores the role on publicMetadata.role — same field
  // checkRole() consults server-side. Show a fast-path button to /admin
  // for anyone holding it, with a label that matches the role so a
  // librarian doesn't think they're an admin.
  const role = (user?.publicMetadata as { role?: string } | undefined)?.role;
  const isStaff = role === "admin" || role === "librarian";
  const staffLabel = role === "admin" ? "Admin" : "Librarian";

  return (
    <div className="p-4 max-w-7xl mx-auto flex justify-between items-center w-full">
      {/* Logo Area */}
      <div>
        <Link href="/" className="flex gap-2 items-center">
          <Image src={"/logo.png"} alt="Logo" width={40} height={40} />
          <h2 className="font-bold text-4xl font-game">Code Block</h2>
        </Link>
      </div>

      {/* Navigation Menu */}
      {!params['exercise-slug'] ? (
        <NavigationMenu>
          <NavigationMenuList className="gap-2">
            <NavigationMenuItem>
              <NavigationMenuLink asChild className={`${navigationMenuTriggerStyle()} bg-transparent text-white hover:bg-zinc-800`}>
                <Link href="/courses">Courses</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuLink asChild className={`${navigationMenuTriggerStyle()} bg-transparent text-white hover:bg-zinc-800`}>
                <Link href="/leaderboard">Leaderboard</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuLink asChild className={`${navigationMenuTriggerStyle()} bg-transparent text-white hover:bg-zinc-800`}>
                <Link href="/pricing">Pricing</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>

          </NavigationMenuList>
        </NavigationMenu>
      ) : (
        <h2 className="text-2xl font-game">
          {params['exercise-slug']?.toString()?.replaceAll('-', ' ').toUpperCase()}
        </h2>
      )}

      {/* Authentication Buttons Area */}
      {!user ? (
        <Link href="/sign-in">
          <Button className="font-game text-xl" variant={"pixel"}>
            Signup
          </Button>
        </Link>
      ) : (
        <div className="flex gap-4 items-center">
          {isStaff && (
            <Link href="/admin">
              <Button
                className="font-game text-xl gap-2 bg-yellow-400 text-black hover:bg-yellow-300 border-2 border-yellow-500"
                variant={"pixel"}
              >
                <Shield className="w-5 h-5" />
                {staffLabel}
              </Button>
            </Link>
          )}
          <Link href="/dashboard">
            <Button className="font-game text-xl" variant={"pixel"}>
              Dashboard
            </Button>
          </Link>
          <UserButton afterSignOutUrl="/" />
        </div>
      )}
    </div>
  );
}

export default Header;