"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";

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