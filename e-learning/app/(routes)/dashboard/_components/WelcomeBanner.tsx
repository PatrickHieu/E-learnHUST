"use client";
import React from "react";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";

function WelcomeBanner() {
    const {user}=useUser();
    return (
        <div className="flex gap-3 items-center">
            <Image src="/machine.webp" alt="robo" width={120} height={120} />
            <h2 className="font-game text-2xl p-2 border bg-zinc-800 rounded-lg rounded-bl-none">
                Welcome Back <span className="text-yellow-400">{user?.fullName}</span>, Start learning something new now !!!
            </h2>
        </div>
        )
}

export default WelcomeBanner;