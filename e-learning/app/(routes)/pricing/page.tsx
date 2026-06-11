"use client";

import React, { useContext, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, CreditCard, Smartphone, Building2 } from "lucide-react";
import { formatVnd, hasProSubscription } from "@/lib/course-access";
import { UserDetailContext } from "@/context/UserDetailContext";

type PayMethod = "vnpay" | "momo" | "card";

const PAY_METHODS: ReadonlyArray<{
  key: PayMethod;
  label: string;
  desc: string;
  icon: React.ReactNode;
}> = [
  { key: "vnpay", label: "VNPay", desc: "National payment gateway", icon: <Building2 className="w-5 h-5 text-blue-400" /> },
  { key: "momo", label: "MoMo", desc: "MoMo e-wallet", icon: <Smartphone className="w-5 h-5 text-pink-400" /> },
  { key: "card", label: "Visa / Mastercard", desc: "Credit / debit card", icon: <CreditCard className="w-5 h-5 text-zinc-300" /> },
];

const PRO_PRICE_VND = 199_000;

const TIERS: Array<{
  name: string;
  priceLabel: string;
  features: string[];
  cta: "subscribe-pro" | "go-signup" | "already-pro";
  highlight?: boolean;
}> = [
  {
    name: "Free",
    priceLabel: "0₫",
    features: [
      "Access every beginner course",
      "Earn stars for every lesson completed",
      "Unlock intermediate courses with stars",
      "Build your portfolio of certificates",
    ],
    cta: "go-signup",
  },
  {
    name: "Pro",
    priceLabel: `${formatVnd(PRO_PRICE_VND)} / month`,
    features: [
      "Everything in Free",
      "All intermediate courses unlocked — no star spending",
      "All advanced (paid) courses included",
      "Priority support and early access to new courses",
    ],
    cta: "subscribe-pro",
    highlight: true,
  },
];

function Pricing() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { userDetail, refreshUserDetail } = useContext(UserDetailContext);
  const [modalOpen, setModalOpen] = useState(false);
  const [chosen, setChosen] = useState<PayMethod | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isPro = hasProSubscription(userDetail?.subscription);

  function startPro() {
    if (status !== "authenticated") {
      router.push("/sign-in?callbackUrl=/pricing");
      return;
    }
    if (isPro) return;
    setChosen(null);
    setModalOpen(true);
  }

  async function confirmPro() {
    if (!chosen || submitting) return;
    setSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 800)); // mock processing
      await axios.post("/api/subscription/checkout", { method: chosen });
      toast.success("Welcome to Pro! Every paid course is unlocked.");
      await refreshUserDetail();
      setModalOpen(false);
      router.push("/courses");
      router.refresh();
    } catch (err: any) {
      const reason = err?.response?.data?.error ?? "Payment failed.";
      toast.error(reason);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-28 flex flex-col items-center justify-center w-full px-10 md:px-20 lg:px-40">
      <h2 className="text-4xl text-center font-game">Pricing</h2>
      <p className="text-xl text-center font-game text-zinc-400 mt-2">
        Join for unlimited access to all features.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10 max-w-3xl w-full">
        {TIERS.map((tier) => {
          const isProTier = tier.cta === "subscribe-pro";
          return (
            <div
              key={tier.name}
              className={`p-6 border-4 rounded-2xl flex flex-col gap-4 ${
                tier.highlight ? "border-yellow-400 bg-yellow-400/5" : "border-zinc-700"
              }`}
            >
              <h3 className="font-game text-3xl">{tier.name}</h3>
              <p className="font-game text-2xl text-yellow-300">{tier.priceLabel}</p>
              <ul className="flex flex-col gap-2 font-game text-lg text-zinc-300 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              {isProTier ? (
                <Button
                  variant="pixel"
                  size="lg"
                  className="font-game text-xl w-full"
                  disabled={isPro}
                  onClick={startPro}
                >
                  {isPro
                    ? "You're already Pro ✓"
                    : status === "authenticated"
                    ? "Upgrade to Pro"
                    : "Sign in to upgrade"}
                </Button>
              ) : (
                <Link href={session?.user ? "/courses" : "/sign-up"}>
                  <Button variant="pixel" size="lg" className="font-game text-xl w-full">
                    {session?.user ? "Browse courses" : "Start learning"}
                  </Button>
                </Link>
              )}
            </div>
          );
        })}
      </div>

      <Dialog
        open={modalOpen}
        onOpenChange={(o) => {
          if (!o && !submitting) {
            setChosen(null);
            setModalOpen(false);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-game text-2xl">Upgrade to Pro</DialogTitle>
            <p className="text-sm text-zinc-400">
              One subscription unlocks every intermediate and advanced course.
            </p>
          </DialogHeader>

          <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border-2 border-zinc-800">
            <p className="text-xs uppercase text-zinc-500 tracking-wider">Subscription</p>
            <p className="font-game text-3xl text-blue-400">
              {formatVnd(PRO_PRICE_VND)}
              <span className="text-base text-zinc-400 ml-1">/ month</span>
            </p>
          </div>

          <div className="flex flex-col gap-2 mt-3">
            <p className="text-xs uppercase text-zinc-500 tracking-wider font-game">
              Choose a payment method
            </p>
            {PAY_METHODS.map((m) => {
              const active = chosen === m.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  disabled={submitting}
                  onClick={() => setChosen(m.key)}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-colors ${
                    active
                      ? "border-yellow-400 bg-yellow-400/10"
                      : "border-zinc-700 hover:border-zinc-500"
                  } disabled:opacity-50`}
                >
                  <div className="w-10 h-10 rounded-md bg-zinc-800 flex items-center justify-center">
                    {m.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-game text-base text-white">{m.label}</p>
                    <p className="text-xs text-zinc-400">{m.desc}</p>
                  </div>
                  {active && (
                    <span className="font-game text-xs text-yellow-300 uppercase">Selected</span>
                  )}
                </button>
              );
            })}
          </div>

          <Button
            variant="pixel"
            size="lg"
            disabled={!chosen || submitting}
            onClick={confirmPro}
            className="font-game text-lg w-full mt-2"
          >
            {submitting ? "Processing payment…" : `Pay ${formatVnd(PRO_PRICE_VND)} / month`}
          </Button>
          <p className="text-xs text-zinc-500 text-center">
            This is a mock payment gateway — no real transaction is made.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Pricing;
