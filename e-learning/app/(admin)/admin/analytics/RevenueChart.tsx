"use client";

import React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatVnd } from "@/lib/course-access";

export type RevenuePoint = {
  day: string;        // YYYY-MM-DD
  revenue: number;    // VND
  txns: number;       // paid transaction count
};

type Props = {
  data: RevenuePoint[];
};

// Friendly day label: "Jun 5" rather than "2026-06-05". Stays English
// per the UI-copy memory; doesn't depend on the user's locale.
function formatDayShort(day: string): string {
  const d = new Date(day + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function RevenueChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-zinc-500">
        No paid transactions in this range yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey="day"
          tickFormatter={formatDayShort}
          stroke="#71717a"
          fontSize={12}
        />
        <YAxis
          tickFormatter={(v: number) =>
            v >= 1_000_000
              ? `${(v / 1_000_000).toFixed(1)}M`
              : v >= 1_000
              ? `${(v / 1_000).toFixed(0)}k`
              : String(v)
          }
          stroke="#71717a"
          fontSize={12}
          width={50}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#18181b",
            border: "1px solid #3f3f46",
            borderRadius: 8,
            color: "#fafafa",
            fontSize: 13,
          }}
          labelStyle={{ color: "#a1a1aa", fontWeight: 500 }}
          formatter={(value: number, name) => {
            if (name === "revenue") return [formatVnd(value), "Revenue"];
            if (name === "txns") return [value, "Transactions"];
            return [value, name];
          }}
          labelFormatter={(label: string) => formatDayShort(label)}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#3b82f6"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#revFill)"
          name="revenue"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default RevenueChart;
