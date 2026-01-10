import { Button } from "@/components/ui/button";
import Image from "next/image";
import Hero from "../app/_components/Hero";
import Headers from "../app/_components/Header";

export default function Home() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
        <Hero/>
    </div>
  );
}
