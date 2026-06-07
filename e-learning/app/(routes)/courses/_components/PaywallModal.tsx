"use client";

import React, { useContext, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import { Star, Lock, CreditCard, Smartphone, Building2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatVnd } from "@/lib/course-access";
import { UserDetailContext } from "@/context/UserDetailContext";
import type { Course } from "./CourseList";

type Props = {
  course: Course | null;
  open: boolean;
  onClose: () => void;
};

type PayMethod = "vnpay" | "momo" | "card";

const PAY_METHODS: ReadonlyArray<{
  key: PayMethod;
  label: string;
  desc: string;
  icon: React.ReactNode;
}> = [
  {
    key: "vnpay",
    label: "VNPay",
    desc: "Cổng thanh toán quốc gia",
    icon: <Building2 className="w-5 h-5 text-blue-400" />,
  },
  {
    key: "momo",
    label: "MoMo",
    desc: "Ví điện tử MoMo",
    icon: <Smartphone className="w-5 h-5 text-pink-400" />,
  },
  {
    key: "card",
    label: "Visa / Mastercard",
    desc: "Credit / debit card",
    icon: <CreditCard className="w-5 h-5 text-zinc-300" />,
  },
];

function PaywallModal({ course, open, onClose }: Props) {
  const router = useRouter();
  const { userDetail, refreshUserDetail } = useContext(UserDetailContext);
  const [submitting, setSubmitting] = useState(false);
  const [chosenMethod, setChosenMethod] = useState<PayMethod | null>(null);

  if (!course) return null;

  const tier = course.accessTier;
  const balance = userDetail?.points ?? 0;
  const cost = course.effectiveUnlockCost ?? 0;
  const price = course.effectivePriceVnd ?? 0;
  const canAfford = tier === "star" ? balance >= cost : true;

  async function handleUnlockWithStars() {
    if (!course || submitting) return;
    setSubmitting(true);
    try {
      const res = await axios.post<{ success: boolean; remaining: number }>(
        "/api/course/unlock",
        { courseId: course.courseId },
      );
      toast.success(
        `Đã mở khóa khóa học! Còn lại ${res.data.remaining} ⭐`,
      );
      await refreshUserDetail();
      onClose();
      router.push(`/courses/${course.courseId}`);
      router.refresh();
    } catch (err: any) {
      const reason =
        err?.response?.data?.error ?? "Không thể mở khóa khóa học.";
      toast.error(reason);
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePurchase() {
    if (!course || !chosenMethod || submitting) return;
    setSubmitting(true);
    try {
      // Brief artificial delay so the spinner reads as "processing
      // payment" rather than feeling like nothing happened.
      await new Promise((r) => setTimeout(r, 800));
      await axios.post("/api/course/purchase", {
        courseId: course.courseId,
        method: chosenMethod,
      });
      toast.success("Thanh toán thành công! Chúc bạn học tốt.");
      await refreshUserDetail();
      onClose();
      router.push(`/courses/${course.courseId}`);
      router.refresh();
    } catch (err: any) {
      const reason =
        err?.response?.data?.error ?? "Thanh toán không thành công.";
      toast.error(reason);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !submitting) {
          setChosenMethod(null);
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <div className="relative h-40 bg-zinc-900">
          <Image
            src={course.bannerImage.trimEnd()}
            alt={course.title}
            fill
            className="object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4 flex items-center gap-2">
            <Lock className="w-4 h-4 text-yellow-400" />
            <span className="font-game text-sm uppercase tracking-wider text-yellow-300">
              {tier === "star" ? "Star unlock" : "Paid course"}
            </span>
          </div>
        </div>

        <DialogHeader className="px-6 pt-4">
          <DialogTitle className="font-game text-2xl">
            {course.title}
          </DialogTitle>
          <p className="text-sm text-zinc-400 line-clamp-3">{course.desc}</p>
        </DialogHeader>

        <div className="px-6 pb-6 flex flex-col gap-4">
          {tier === "star" ? (
            <StarUnlockBody
              balance={balance}
              cost={cost}
              canAfford={canAfford}
              submitting={submitting}
              onConfirm={handleUnlockWithStars}
              onClose={onClose}
            />
          ) : (
            <PaidCheckoutBody
              price={price}
              chosen={chosenMethod}
              onChoose={setChosenMethod}
              submitting={submitting}
              onConfirm={handlePurchase}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StarUnlockBody({
  balance,
  cost,
  canAfford,
  submitting,
  onConfirm,
  onClose,
}: {
  balance: number;
  cost: number;
  canAfford: boolean;
  submitting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const remaining = balance - cost;

  return (
    <>
      <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border-2 border-zinc-800">
        <div>
          <p className="text-xs uppercase text-zinc-500 tracking-wider">
            Chi phí mở khóa
          </p>
          <p className="font-game text-3xl text-yellow-300 inline-flex items-center gap-2">
            <Star className="w-6 h-6 fill-yellow-300 text-yellow-300" />
            {cost.toLocaleString("vi-VN")}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase text-zinc-500 tracking-wider">
            Bạn đang có
          </p>
          <p className="font-game text-xl text-white inline-flex items-center gap-2">
            <Star className="w-4 h-4 fill-yellow-400/60 text-yellow-400" />
            {balance.toLocaleString("vi-VN")}
          </p>
        </div>
      </div>

      {canAfford ? (
        <div className="flex items-center justify-between text-sm font-game">
          <span className="text-zinc-400">Sau khi mở khóa, bạn còn:</span>
          <span className="text-green-400 inline-flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-green-400 text-green-400" />
            {remaining.toLocaleString("vi-VN")} ⭐
          </span>
        </div>
      ) : (
        <div className="p-3 rounded-md border border-red-500/40 bg-red-500/10 text-sm font-game text-red-200">
          Bạn cần thêm {(cost - balance).toLocaleString("vi-VN")} ⭐ để mở khóa khóa học này.
          {" "}
          <Link
            href="/courses?level=beginner"
            onClick={onClose}
            className="underline text-yellow-300 ml-1"
          >
            Học các khóa miễn phí để kiếm thêm sao →
          </Link>
        </div>
      )}

      <Button
        variant="pixel"
        size="lg"
        disabled={!canAfford || submitting}
        onClick={onConfirm}
        className="font-game text-lg w-full"
      >
        {submitting ? "Đang xử lý…" : `Mở khóa với ${cost.toLocaleString("vi-VN")} ⭐`}
      </Button>
    </>
  );
}

function PaidCheckoutBody({
  price,
  chosen,
  onChoose,
  submitting,
  onConfirm,
}: {
  price: number;
  chosen: PayMethod | null;
  onChoose: (m: PayMethod) => void;
  submitting: boolean;
  onConfirm: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border-2 border-zinc-800">
        <p className="text-xs uppercase text-zinc-500 tracking-wider">
          Học phí
        </p>
        <p className="font-game text-3xl text-blue-400">{formatVnd(price)}</p>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase text-zinc-500 tracking-wider font-game">
          Chọn phương thức thanh toán
        </p>
        {PAY_METHODS.map((m) => {
          const active = chosen === m.key;
          return (
            <button
              key={m.key}
              type="button"
              disabled={submitting}
              onClick={() => onChoose(m.key)}
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
                <span className="font-game text-xs text-yellow-300 uppercase">
                  Đã chọn
                </span>
              )}
            </button>
          );
        })}
      </div>

      <Button
        variant="pixel"
        size="lg"
        disabled={!chosen || submitting}
        onClick={onConfirm}
        className="font-game text-lg w-full"
      >
        {submitting
          ? "Đang xử lý thanh toán…"
          : `Thanh toán ${formatVnd(price)}`}
      </Button>
      <p className="text-xs text-zinc-500 text-center">
        Đây là cổng thanh toán mô phỏng (mock). Không có giao dịch thật.
      </p>
    </>
  );
}

export default PaywallModal;
