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
            tick={{ fontSize: 12, fill: "var(--muted)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "var(--hover)" }}
            contentStyle={{
              background: "var(--surface-raised)",
              border: "1px solid var(--line)",
              borderRadius: 12,
              color: "var(--ink)",
            }}
          />
          <Bar
            isAnimationActive={false}
            dataKey="count"
            fill="var(--accent)"
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
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.7} />
              <stop
                offset="100%"
                stopColor="var(--accent)"
                stopOpacity={0.03}
              />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis
            dataKey="month"
            tickFormatter={(v) =>
              new Date(v + "-02").toLocaleDateString("en-US", {
                month: "short",
              })
            }
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            minTickGap={28}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            width={28}
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface-raised)",
              border: "1px solid var(--line)",
              borderRadius: 12,
              color: "var(--ink)",
            }}
          />
          <Area
            isAnimationActive={false}
            type="monotone"
            dataKey="conversationsWithFindings"
            name="Chats with findings"
            stroke="var(--accent)"
            strokeWidth={2}
            fill="url(#timeline-fill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
