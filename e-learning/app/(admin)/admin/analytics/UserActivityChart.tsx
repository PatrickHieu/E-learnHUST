"use client";

import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ActivityPoint = {
  day: string;        // YYYY-MM-DD
  dau: number;        // distinct users with a completion that day
  completions: number;// raw completion count that day
};

type Props = {
  data: ActivityPoint[];
};

function formatDayShort(day: string): string {
  const d = new Date(day + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function UserActivityChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-zinc-500">
        No learner activity in this range yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey="day"
          tickFormatter={formatDayShort}
          stroke="#71717a"
          fontSize={12}
        />
        <YAxis
          allowDecimals={false}
          stroke="#71717a"
          fontSize={12}
          width={40}
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
            if (name === "dau") return [value, "Active learners"];
            if (name === "completions") return [value, "Lessons completed"];
            return [value, name];
          }}
          labelFormatter={(label: string) => formatDayShort(label)}
        />
        <Bar dataKey="dau" fill="#22c55e" name="dau" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default UserActivityChart;
