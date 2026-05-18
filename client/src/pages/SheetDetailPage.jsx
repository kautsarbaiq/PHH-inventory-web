// ============================================================
// PHH Inventory — Sheet Detail Page (Main Workspace)
// Refactored: spacing, error/loading states, canvas isolation,
// improved cutting history table, theme transitions
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { sheetApi, cuttingApi } from "../lib/api";
import { formatArea, formatPercent } from "../lib/calculations";
import {
  ArrowLeft,
  Ruler,
  Scissors,
  BarChart3,
  Clock,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import MasterSheetCanvas from "../components/canvas/MasterSheetCanvas";
import CuttingOrderForm from "../components/forms/CuttingOrderForm";
import UsageDonutChart from "../components/dashboard/UsageDonutChart";

export default function SheetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState(null);
  const [cuttings, setCuttings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setError("");
    try {
      const [sheetRes, cuttingsRes] = await Promise.all([
        sheetApi.getById(id),
        cuttingApi.list(id),
      ]);
      setSheet(sheetRes.data.data);
      setCuttings(cuttingsRes.data.data || []);
    } catch (err) {
      console.error("Failed to load sheet:", err);
      setError("Gagal memuat data sheet. Periksa koneksi server.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCuttingCreated = () => fetchData();

  const handlePositionUpdate = async (cuttingId, newPos) => {
    try {
      await cuttingApi.updatePosition(id, cuttingId, newPos);
      fetchData();
    } catch (err) {
      console.error("Position update failed:", err);
      fetchData(); // Refresh to reset invalid position
    }
  };

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 skeleton rounded-lg" />
          <div className="space-y-2">
            <div className="h-7 w-48 skeleton" />
            <div className="h-4 w-72 skeleton" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[480px] skeleton rounded-xl" />
          <div className="h-80 skeleton rounded-xl" />
        </div>
        <div className="h-40 skeleton rounded-xl" />
        <div className="h-48 skeleton rounded-xl" />
      </div>
    );
  }

  // ── Not found ──
  if (!sheet && !error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-text-muted">
        <AlertTriangle className="w-12 h-12 mb-4 opacity-30" />
        <p className="text-lg font-semibold text-text-secondary">
          Sheet not found
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          className="mt-4 text-primary hover:text-primary-light transition-colors cursor-pointer text-sm font-medium"
        >
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  // ── Error state ──
  if (error && !sheet) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="flex items-center gap-3 p-5 rounded-xl bg-danger/10 border border-danger/20 mb-6">
          <AlertTriangle className="w-5 h-5 text-danger shrink-0" />
          <p className="text-sm text-danger-light font-medium">{error}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors cursor-pointer text-sm"
          >
            ← Dashboard
          </button>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors cursor-pointer text-sm font-medium"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const usedPct = sheet.usedPercentage || 0;
  const availPct = sheet.availablePercentage || 0;
  const scrapPct =
    sheet.totalArea > 0 ? ((sheet.scrapArea || 0) / sheet.totalArea) * 100 : 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/dashboard")}
          className="p-2.5 rounded-lg hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors cursor-pointer theme-transition focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1 focus:ring-offset-bg-base"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            {sheet.sheetNumber}
          </h1>
          <p className="text-text-secondary text-sm mt-0.5">
            {sheet.grade} • {sheet.supplier} •{" "}
            <span className="font-medium">{sheet.length}×{sheet.width}×{sheet.thickness} mm</span>
          </p>
        </div>
      </div>

      {/* ── Main Grid: Canvas + Stats ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Canvas (2/3) */}
        <div className="lg:col-span-2 bg-bg-surface rounded-xl border border-border p-4 md:p-5 lg:p-6 theme-transition">
          <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
            <Ruler className="w-4 h-4" /> Visual Canvas
          </h2>
          <MasterSheetCanvas
            sheet={sheet}
            cuttings={cuttings}
            onPositionUpdate={handlePositionUpdate}
          />
        </div>

        {/* Stats (1/3) */}
        <div className="space-y-6">
          {/* Donut Chart */}
          <div className="bg-bg-surface rounded-xl border border-border p-4 md:p-5 lg:p-6 theme-transition">
            <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Usage Stats
            </h2>
            <UsageDonutChart
              usedPercent={usedPct}
              availablePercent={availPct}
              scrapPercent={scrapPct}
            />
            <div className="space-y-3 mt-5 pt-5 border-t border-border/50">
              <StatRow label="Total Area" value={formatArea(sheet.totalArea)} />
              <StatRow
                label="Used"
                value={formatArea(sheet.usedArea || 0)}
                color="text-danger"
              />
              <StatRow
                label="Available"
                value={formatArea(sheet.availableArea || 0)}
                color="text-primary"
              />
              <StatRow
                label="Scrap"
                value={formatArea(sheet.scrapArea || 0)}
                color="text-scrap"
              />
              <div className="border-t border-border/50 pt-3 space-y-3">
                <StatRow label="Cuts" value={sheet.cuttingCount || 0} />
                <StatRow label="Kerf" value={`${sheet.kerfAllowance} mm`} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Cutting Order Form ── */}
      <div className="bg-bg-surface rounded-xl border border-border p-4 md:p-5 lg:p-6 theme-transition">
        <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-5 flex items-center gap-2">
          <Scissors className="w-4 h-4" /> New Cutting Order
        </h2>
        <CuttingOrderForm
          sheetId={id}
          sheet={sheet}
          onCreated={handleCuttingCreated}
        />
      </div>

      {/* ── Cutting History ── */}
      <div className="bg-bg-surface rounded-xl border border-border p-4 md:p-5 lg:p-6 theme-transition">
        <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-5 flex items-center gap-2">
          <Clock className="w-4 h-4" /> Cutting History
        </h2>
        {cuttings.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-text-muted">
            <Scissors className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-sm font-medium">No cuttings yet</p>
            <p className="text-xs mt-1">Use the form above to add your first cut</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/50">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-bg-elevated/50 border-b border-border theme-transition">
                  <th className="text-left py-3 px-4 font-semibold text-text-secondary text-xs uppercase tracking-wider">#</th>
                  <th className="text-left py-3 px-4 font-semibold text-text-secondary text-xs uppercase tracking-wider">Job #</th>
                  <th className="text-left py-3 px-4 font-semibold text-text-secondary text-xs uppercase tracking-wider">Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-text-secondary text-xs uppercase tracking-wider">Dimensions</th>
                  <th className="text-right py-3 px-4 font-semibold text-text-secondary text-xs uppercase tracking-wider">Area</th>
                  <th className="text-right py-3 px-4 font-semibold text-text-secondary text-xs uppercase tracking-wider">Effective</th>
                  <th className="text-left py-3 px-4 font-semibold text-text-secondary text-xs uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody>
                {cuttings.map((cut, idx) => (
                  <tr
                    key={cut.id}
                    className="border-b border-border/30 hover:bg-bg-elevated/30 transition-colors theme-transition"
                  >
                    <td className="py-3 px-4 text-text-muted font-medium">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-semibold text-text-primary">
                      {cut.jobNumber}
                    </td>
                    <td className="py-3 px-4">
                      <TypeBadge type={cut.cuttingType} />
                    </td>
                    <td className="py-3 px-4 text-text-secondary font-medium">
                      <DimensionLabel type={cut.cuttingType} dims={cut.dimensions} />
                    </td>
                    <td className="py-3 px-4 text-right text-text-secondary tabular-nums">
                      {formatArea(cut.cutArea)}
                    </td>
                    <td className="py-3 px-4 text-right text-text-muted tabular-nums">
                      {formatArea(cut.effectiveArea)}
                    </td>
                    <td className="py-3 px-4 text-text-muted tabular-nums">
                      {new Date(cut.createdAt).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Inline helper components ──

function StatRow({ label, value, color = "text-text-primary" }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-text-muted font-medium">{label}</span>
      <span className={`font-semibold ${color} tabular-nums`}>{value}</span>
    </div>
  );
}

const TYPE_STYLES = {
  rectangle: { label: "▭ Rect", color: "text-shape-rect", bg: "bg-shape-rect/10" },
  circle: { label: "⭕ Circle", color: "text-shape-circle", bg: "bg-shape-circle/10" },
  triangle: { label: "△ Tri", color: "text-shape-triangle", bg: "bg-shape-triangle/10" },
};

function TypeBadge({ type }) {
  const style = TYPE_STYLES[type] || TYPE_STYLES.rectangle;
  return (
    <span className={`inline-flex items-center justify-center px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide ${style.bg} ${style.color}`}>
      {style.label}
    </span>
  );
}

function DimensionLabel({ type, dims }) {
  if (!dims) return "—";
  switch (type) {
    case "rectangle":
      return `${dims.length}×${dims.width} mm`;
    case "circle":
      return `r=${dims.radius} mm`;
    case "triangle":
      return `${dims.base}×${dims.height} mm`;
    default:
      return "—";
  }
}
