"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import axios from "axios";
import { Course } from '../(routes)/courses/_components/CourseList';

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

function Header() {
  const { user } = useUser();
  const path = usePathname();
  const params = useParams();
  const [courses, setCourses] = useState<Course[]>([]);

  const GetCourse = async () => {
    try {
      const result = await axios.get('/api/course');
      if (Array.isArray(result.data)) {
        setCourses(result.data);
      } else {
        setCourses([]);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
      setCourses([]);
    }
  }

  useEffect(() => {
    GetCourse();
  }, []);

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
      {!params['exercise-slug'] && Array.isArray(courses) && courses.length > 0 ? (
        <NavigationMenu>
          <NavigationMenuList className="gap-2">

            {/* 1. Dropdown Courses */}
            <NavigationMenuItem>
              <NavigationMenuTrigger className="bg-transparent text-white hover:text-white/80">
                Courses
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid md:grid-cols-2 gap-2 p-4 w-[300px] md:w-[400px] lg:w-[500px]">
                  {courses.map((course, index) => (
                    <li key={index}>
                      <NavigationMenuLink asChild>
                        <Link
                          href={`/courses/${course.courseId}`}
                          className="block p-3 hover:bg-zinc-800 rounded-xl cursor-pointer transition-colors"
                        >
                          <h2 className="font-medium text-white">{course?.title}</h2>
                          <p className="text-sm text-zinc-400 line-clamp-2 mt-1">{course?.desc}</p>
                        </Link>
                      </NavigationMenuLink>
                    </li>
                  ))}
                </ul>
              </NavigationMenuContent>
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