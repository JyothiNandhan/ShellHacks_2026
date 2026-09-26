"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";
import { EXPLANATIONS } from "@promptshield/engine";
import type { Category, ScanReport } from "../lib/report/types";
export function CategoryChart({ report }: { report: ScanReport }) {
  const data = Object.entries(report.countsByType)
    .map(([type, count]) => ({
      name: EXPLANATIONS[type as Category].label,
      count,
    }))
    .sort((a, b) => b.count! - a.count!);
  return (
    <div
      className="chart"
      role="img"
      aria-label={data.map((d) => `${d.name}: ${d.count} chats`).join(", ")}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 25 }}>
          <XAxis type="number" allowDecimals={false} hide />
          <YAxis
            type="category"
            dataKey="name"
            width={130}
            tick={{ fontSize: 12, fill: "#4f554b" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip cursor={{ fill: "#eff2e8" }} />
          <Bar
            isAnimationActive={false}
            dataKey="count"
            fill="#789344"
            radius={[0, 4, 4, 0]}
            maxBarSize={23}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
export function TimelineChart({ report }: { report: ScanReport }) {
  return (
    <div
      className="chart"
      role="img"
      aria-label={report.timeline
        .map((t) => `${t.month}: ${t.conversationsWithFindings} chats`)
        .join(", ")}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={report.timeline}
          margin={{ left: 0, right: 16, top: 20 }}
        >
          <defs>
            <linearGradient id="timeline-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a9c76b" stopOpacity={0.7} />
              <stop offset="100%" stopColor="#a9c76b" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#e5e8df" />
          <XAxis
            dataKey="month"
            tickFormatter={(v) =>
              new Date(v + "-02").toLocaleDateString("en-US", {
                month: "short",
              })
            }
            tick={{ fontSize: 11 }}
            minTickGap={28}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            width={28}
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip />
          <Area
            isAnimationActive={false}
            type="monotone"
            dataKey="conversationsWithFindings"
            name="Chats with findings"
            stroke="#718a3f"
            strokeWidth={2}
            fill="url(#timeline-fill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
