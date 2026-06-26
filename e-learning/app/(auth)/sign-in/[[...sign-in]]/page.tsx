"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

const CARD =
  "mx-auto w-full sm:w-96 space-y-6 bg-white px-4 py-8 border-4 border-black shadow-[8px_8px_0_0_#000]";
const INPUT =
  "w-full px-3 py-2 bg-white text-black caret-black placeholder:text-zinc-400 border-2 border-black shadow-[3px_3px_0_0_#000] outline-none focus:border-yellow-500";
const SUBMIT =
  "w-full px-4 py-2 bg-yellow-400 border-2 border-black shadow-[4px_4px_0_0_#000] active:translate-y-[2px] active:shadow-none text-black font-bold uppercase disabled:opacity-50 disabled:cursor-not-allowed";
const LABEL = "block font-bold text-black uppercase mb-1";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (!res || res.error) {
        setError("Invalid email or password.");
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleGoogle() {
    // Server-redirect Google flow — Auth.js handles the round-trip
    // and lands the user on callbackUrl (or /dashboard) on return.
    signIn("google", { callbackUrl });
  }

  return (
    <div className="min-h-screen grid w-full items-center bg-zinc-100 px-4 font-mono text-sm">
      <form onSubmit={handleSubmit} className={CARD}>
        <header className="text-center flex flex-col items-center">
          <Image src={"/logo.png"} alt="Logo" width={40} height={40} />
          <h1 className="mt-3 text-base font-bold tracking-wide text-black uppercase">
            Sign in to ByteCraft
          </h1>
        </header>

        {error && (
          <div className="block text-sm text-red-500 border border-red-200 bg-red-50 px-3 py-2">
            {error}
          </div>
        )}

        {/* Google OAuth — bypasses the email/password form entirely. */}
        <button
          type="button"
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 px-4 py-2 bg-white border-2 border-black shadow-[4px_4px_0_0_#000] active:translate-y-[2px] active:shadow-none text-black font-bold uppercase"
        >
          <svg viewBox="0 0 48 48" className="w-5 h-5" aria-hidden>
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
            <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.197l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3 text-xs text-zinc-500 uppercase">
          <div className="flex-1 border-t border-zinc-300" />
          or
          <div className="flex-1 border-t border-zinc-300" />
        </div>

        <div>
          <label className={LABEL}>Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={INPUT}
            autoComplete="email"
          />
        </div>

        <div>
          <label className={LABEL}>Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={INPUT}
            autoComplete="current-password"
          />
        </div>

        <button type="submit" disabled={submitting} className={SUBMIT}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>

        <p className="text-center text-xs text-black">
          No account?{" "}
          <Link
            href="/sign-up"
            className="font-bold underline underline-offset-2 hover:text-yellow-600"
          >
            Create an account
          </Link>
        </p>
      </form>
    </div>
  );
}
