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

  return (
    <div className="min-h-screen grid w-full items-center bg-zinc-100 px-4 font-mono text-sm">
      <form onSubmit={handleSubmit} className={CARD}>
        <header className="text-center flex flex-col items-center">
          <Image src={"/logo.png"} alt="Logo" width={40} height={40} />
          <h1 className="mt-3 text-base font-bold tracking-wide text-black uppercase">
            Sign in to Code Block
          </h1>
        </header>

        {error && (
          <div className="block text-sm text-red-500 border border-red-200 bg-red-50 px-3 py-2">
            {error}
          </div>
        )}

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
