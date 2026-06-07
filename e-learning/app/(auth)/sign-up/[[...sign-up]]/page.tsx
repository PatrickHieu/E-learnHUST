"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";

const CARD =
  "mx-auto w-full sm:w-96 space-y-6 bg-zinc-800 px-4 py-8 border-4 border-black shadow-[8px_8px_0_0_#000]";
const INPUT =
  "w-full px-3 py-2 bg-zinc-900 text-white caret-yellow-400 placeholder:text-zinc-500 border-2 border-black shadow-[3px_3px_0_0_#000] outline-none focus:border-yellow-400";
const SUBMIT =
  "w-full px-4 py-2 bg-yellow-400 border-2 border-black shadow-[4px_4px_0_0_#000] active:translate-y-[2px] active:shadow-none text-black font-bold uppercase disabled:opacity-50 disabled:cursor-not-allowed";
const LABEL = "block font-bold text-yellow-400 uppercase mb-1";

export default function SignUpPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await axios.post("/api/auth/register", { name, email, password });
      // After register, sign in immediately so the user lands in a
      // logged-in state without a second form.
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (!res || res.error) {
        // Edge case: register succeeded but auto-sign-in failed.
        // Bounce to /sign-in so they can finish manually.
        router.push("/sign-in");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      const reason = err?.response?.data?.error ?? "Could not create the account.";
      setError(reason);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen grid w-full items-center bg-zinc-900 px-4 font-mono text-sm text-white">
      <form onSubmit={handleSubmit} className={CARD}>
        <header className="text-center flex flex-col items-center">
          <Image src={"/logo.png"} alt="Logo" width={40} height={40} />
          <h1 className="mt-3 text-base font-bold tracking-wide text-yellow-400 uppercase">
            Create account
          </h1>
        </header>

        {error && (
          <div className="block text-sm text-red-300 border border-red-500/40 bg-red-500/10 px-3 py-2">
            {error}
          </div>
        )}

        <div>
          <label className={LABEL}>Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={INPUT}
            autoComplete="name"
          />
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
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={INPUT}
            autoComplete="new-password"
          />
          <p className="text-xs text-zinc-500 mt-1">At least 6 characters.</p>
        </div>

        <button type="submit" disabled={submitting} className={SUBMIT}>
          {submitting ? "Creating…" : "Sign up"}
        </button>

        <p className="text-center text-xs text-yellow-400">
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="font-bold underline underline-offset-2 hover:text-yellow-200"
          >
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
