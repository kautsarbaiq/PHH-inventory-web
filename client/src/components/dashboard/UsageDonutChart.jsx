// ============================================================
// PHH Inventory — Usage Donut Chart
// ============================================================

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

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
  const data = [
    { name: "Used", value: usedPercent, color: COLORS.used },
    { name: "Available", value: Math.max(availablePercent - scrapPercent, 0), color: COLORS.available },
    { name: "Scrap", value: scrapPercent, color: COLORS.scrap },
  ].filter((d) => d.value > 0);

  // Fallback if no data
  if (data.length === 0) {
    data.push({ name: "Available", value: 100, color: COLORS.available });
  }

  return (
    <div className="flex flex-col items-center">
      <div className="w-40 h-40 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={65}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-text-primary">
            {usedPercent.toFixed(0)}%
          </span>
          <span className="text-xs text-text-muted">Used</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-3 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-danger" />
          <span className="text-text-secondary">Used</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-primary" />
          <span className="text-text-secondary">Available</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-scrap" />
          <span className="text-text-secondary">Scrap</span>
        </span>
      </div>
    </div>
  );
}
