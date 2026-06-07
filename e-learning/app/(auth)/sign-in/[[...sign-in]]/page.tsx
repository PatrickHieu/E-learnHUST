"use client";

import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";
import Image from "next/image";

// Pixel-art card shell shared by every step so the multi-step
// sign-in flow stays visually consistent.
const STEP_CARD =
  "mx-auto w-full sm:w-96 space-y-6 bg-white px-4 py-8 border-4 border-black shadow-[8px_8px_0_0_#000]";
const INPUT =
  "w-full px-3 py-2 bg-white text-black caret-black placeholder:text-zinc-400 border-2 border-black shadow-[3px_3px_0_0_#000] outline-none focus:border-yellow-500";
const SUBMIT =
  "w-full px-4 py-2 bg-yellow-400 border-2 border-black shadow-[4px_4px_0_0_#000] active:translate-y-[2px] active:shadow-none text-black font-bold uppercase";
const LABEL = "font-bold text-black uppercase";

export default function SignInPage() {
  return (
    <div className="min-h-screen grid w-full items-center bg-zinc-100 px-4 font-mono text-sm">
      <SignIn.Root>
        {/* ─── Step 1 — start (identifier + optional password) ─── */}
        <SignIn.Step name="start" className={STEP_CARD}>
          <header className="text-center flex flex-col items-center">
            <Image src={"/logo.png"} alt="Logo" width={40} height={40} />
            <h1 className="mt-3 text-base font-bold tracking-wide text-black uppercase">
              Sign in to Clover
            </h1>
          </header>

          <Clerk.GlobalError className="block text-sm text-red-500" />

          {/* Google */}
          <Clerk.Connection
            name="google"
            className="flex w-full items-center justify-center gap-3 px-4 py-2 bg-yellow-400 border-2 border-black shadow-[4px_4px_0_0_#000] active:translate-y-[2px] active:shadow-none font-bold"
          >
            <span className="text-black">Login with Google</span>
          </Clerk.Connection>

          <div className="space-y-4">
            <Clerk.Field name="identifier" className="space-y-1">
              <Clerk.Label className={LABEL}>Email</Clerk.Label>
              <Clerk.Input type="email" required className={INPUT} />
              <Clerk.FieldError className="text-sm text-red-500" />
            </Clerk.Field>
          </div>

          <SignIn.Action submit className={SUBMIT}>
            Continue
          </SignIn.Action>

          <p className="text-center text-xs text-black">
            No account?{" "}
            <Clerk.Link
              navigate="sign-up"
              className="font-bold underline underline-offset-2 hover:text-yellow-600"
            >
              Create an account
            </Clerk.Link>
          </p>
        </SignIn.Step>

        {/* ─── Step 2 — verifications (password + email_code branches) ─── */}
        <SignIn.Step name="verifications" className={STEP_CARD}>
          <header className="text-center flex flex-col items-center">
            <Image src={"/logo.png"} alt="Logo" width={40} height={40} />
            <h1 className="mt-3 text-base font-bold tracking-wide text-black uppercase">
              Verify it&apos;s you
            </h1>
          </header>

          <Clerk.GlobalError className="block text-sm text-red-500" />

          {/* Password first-factor */}
          <SignIn.Strategy name="password">
            <div className="space-y-4">
              <Clerk.Field name="password" className="space-y-1">
                <Clerk.Label className={LABEL}>Password</Clerk.Label>
                <Clerk.Input type="password" required className={INPUT} />
                <Clerk.FieldError className="text-sm text-red-500" />
              </Clerk.Field>
            </div>

            <SignIn.Action submit className={SUBMIT}>
              Sign in
            </SignIn.Action>

            <p className="text-center text-xs text-black">
              <SignIn.Action
                navigate="forgot-password"
                className="font-bold underline underline-offset-2 hover:text-yellow-600"
              >
                Forgot password?
              </SignIn.Action>
            </p>
          </SignIn.Strategy>

          {/* Email-code first-factor (if Clerk routes the user here) */}
          <SignIn.Strategy name="email_code">
            <p className="text-center text-xs text-zinc-600">
              We sent a 6-digit code to your email.
            </p>
            <Clerk.Field name="code" className="space-y-1">
              <Clerk.Label className={LABEL}>Email code</Clerk.Label>
              <Clerk.Input type="otp" required className={INPUT} />
              <Clerk.FieldError className="text-sm text-red-500" />
            </Clerk.Field>
            <SignIn.Action submit className={SUBMIT}>
              Verify
            </SignIn.Action>
          </SignIn.Strategy>
        </SignIn.Step>

        {/* ─── Step 3 — forgot-password ─── */}
        <SignIn.Step name="forgot-password" className={STEP_CARD}>
          <header className="text-center flex flex-col items-center">
            <Image src={"/logo.png"} alt="Logo" width={40} height={40} />
            <h1 className="mt-3 text-base font-bold tracking-wide text-black uppercase">
              Reset your password
            </h1>
          </header>
          <Clerk.GlobalError className="block text-sm text-red-500" />
          <SignIn.SupportedStrategy
            name="reset_password_email_code"
            asChild
          >
            <button type="button" className={SUBMIT}>
              Email me a reset code
            </button>
          </SignIn.SupportedStrategy>
          <SignIn.Action
            navigate="previous"
            className="block text-center text-xs text-black font-bold underline underline-offset-2 hover:text-yellow-600"
          >
            Back to sign in
          </SignIn.Action>
        </SignIn.Step>

        {/* ─── Step 4 — reset-password ─── */}
        <SignIn.Step name="reset-password" className={STEP_CARD}>
          <header className="text-center flex flex-col items-center">
            <Image src={"/logo.png"} alt="Logo" width={40} height={40} />
            <h1 className="mt-3 text-base font-bold tracking-wide text-black uppercase">
              Set a new password
            </h1>
          </header>
          <Clerk.GlobalError className="block text-sm text-red-500" />
          <Clerk.Field name="password" className="space-y-1">
            <Clerk.Label className={LABEL}>New password</Clerk.Label>
            <Clerk.Input type="password" required className={INPUT} />
            <Clerk.FieldError className="text-sm text-red-500" />
          </Clerk.Field>
          <Clerk.Field name="confirmPassword" className="space-y-1">
            <Clerk.Label className={LABEL}>Confirm password</Clerk.Label>
            <Clerk.Input type="password" required className={INPUT} />
            <Clerk.FieldError className="text-sm text-red-500" />
          </Clerk.Field>
          <SignIn.Action submit className={SUBMIT}>
            Update password
          </SignIn.Action>
        </SignIn.Step>
      </SignIn.Root>
    </div>
  );
}
