// ============================================================
// PHH Inventory — Usage Donut Chart (Theme-Aware)
// ============================================================

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useTheme } from "../layout/ThemeProvider";

const COLORS = {
  used: "#ef4444",
  available: "#3b82f6",
  scrap: "#6b7280",
};

export default function UsageDonutChart({
  usedPercent,
  availablePercent,
  scrapPercent,
}) {
  const { isDark } = useTheme();

  // `availablePercent` already excludes scrap (server: availableArea / totalArea),
  // so used + available + scrap ≈ 100 with no double-subtraction.
  const data = [
    { name: "Used", value: usedPercent, color: COLORS.used },
    { name: "Available", value: Math.max(availablePercent, 0), color: COLORS.available },
    { name: "Scrap", value: scrapPercent, color: COLORS.scrap },
  ].filter((d) => d.value > 0);

  // Fallback if no data
  if (data.length === 0) {
    data.push({ name: "Available", value: 100, color: COLORS.available });
  }

  return (
    <div className="flex flex-col items-center">
      <div className="w-44 h-44 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={68}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
              animationBegin={0}
              animationDuration={800}
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? "#1e293b" : "#ffffff",
                border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
                borderRadius: "8px",
                color: isDark ? "#f8fafc" : "#0f172a",
                fontSize: "12px",
                padding: "8px 12px",
              }}
              formatter={(value) => [`${value.toFixed(1)}%`, null]}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-text-primary tabular-nums">
            {usedPercent.toFixed(0)}%
          </span>
          <span className="text-xs text-text-muted font-medium">Used</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-5 mt-4 text-xs">
        <span className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-danger" />
          <span className="text-text-secondary font-medium">Used</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-primary" />
          <span className="text-text-secondary font-medium">Available</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-scrap" />
          <span className="text-text-secondary font-medium">Scrap</span>
        </span>
      </div>
    </div>
  );
}
