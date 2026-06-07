import type { Metadata } from "next";
import { Geist, Geist_Mono, Jersey_10 } from "next/font/google";
import "./globals.css";
import Provider from "./provider";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const GameFont = Jersey_10({
  variable: "--font-game",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Code Block · E-learnHUST",
  description: "Beginner-friendly coding courses and projects.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${GameFont.variable} antialiased`}
      >
        <SessionProvider>
          <Provider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
          </Provider>
        </SessionProvider>
      </body>
    </html>
  );
}
