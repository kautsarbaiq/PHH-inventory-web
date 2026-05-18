// ============================================================
// PHH Inventory — Sheet Detail Page (Main Workspace)
// ============================================================

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { sheetApi, cuttingApi } from "../lib/api";
import { formatArea, formatPercent } from "../lib/calculations";
import {
  ArrowLeft,
  Ruler,
  Scissors,
  BarChart3,
  Clock,
  Trash2,
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

  const fetchData = async () => {
    try {
      const [sheetRes, cuttingsRes] = await Promise.all([
        sheetApi.getById(id),
        cuttingApi.list(id),
      ]);
      setSheet(sheetRes.data.data);
      setCuttings(cuttingsRes.data.data || []);
    } catch (err) {
      console.error("Failed to load sheet:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

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

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-bg-surface rounded-lg w-64" />
        <div className="h-96 bg-bg-surface rounded-xl" />
        <div className="h-48 bg-bg-surface rounded-xl" />
      </div>
    );
  }

  if (!sheet) {
    return (
      <div className="text-center py-20 text-text-muted">
        <p className="text-lg">Sheet not found</p>
        <button
          onClick={() => navigate("/dashboard")}
          className="mt-4 text-primary hover:text-primary-light transition-colors cursor-pointer"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const usedPct = sheet.usedPercentage || 0;
  const availPct = sheet.availablePercentage || 0;
  const scrapPct =
    sheet.totalArea > 0 ? ((sheet.scrapArea || 0) / sheet.totalArea) * 100 : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/dashboard")}
          className="p-2 rounded-lg hover:bg-bg-surface text-text-muted hover:text-text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {sheet.sheetNumber}
          </h1>
          <p className="text-text-secondary text-sm">
            {sheet.grade} • {sheet.supplier} •{" "}
            {sheet.length}×{sheet.width}×{sheet.thickness} mm
          </p>
        </div>
      </div>

      {/* Main Grid: Canvas + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Canvas (2/3) */}
        <div className="lg:col-span-2 bg-bg-surface rounded-xl border border-border p-4">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
            <Ruler className="w-4 h-4" /> Visual Canvas
          </h2>
          <MasterSheetCanvas
            sheet={sheet}
            cuttings={cuttings}
            onPositionUpdate={handlePositionUpdate}
          />
        </div>

        {/* Stats (1/3) */}
        <div className="space-y-4">
          {/* Donut Chart */}
          <div className="bg-bg-surface rounded-xl border border-border p-4">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Usage Stats
            </h2>
            <UsageDonutChart
              usedPercent={usedPct}
              availablePercent={availPct}
              scrapPercent={scrapPct}
            />
            <div className="space-y-2 mt-4">
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
              <StatRow
                label="Cuts"
                value={sheet.cuttingCount || 0}
              />
              <StatRow
                label="Kerf"
                value={`${sheet.kerfAllowance} mm`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Cutting Order Form */}
      <div className="bg-bg-surface rounded-xl border border-border p-5">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
          <Scissors className="w-4 h-4" /> New Cutting Order
        </h2>
        <CuttingOrderForm
          sheetId={id}
          sheet={sheet}
          onCreated={handleCuttingCreated}
        />
      </div>

      {/* Cutting Log */}
      <div className="bg-bg-surface rounded-xl border border-border p-5">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4" /> Cutting History
        </h2>
        {cuttings.length === 0 ? (
          <p className="text-text-muted text-sm py-4 text-center">
            No cuttings yet — use the form above to add one
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-secondary">
                  <th className="text-left py-2 px-3 font-medium">#</th>
                  <th className="text-left py-2 px-3 font-medium">Job #</th>
                  <th className="text-left py-2 px-3 font-medium">Type</th>
                  <th className="text-left py-2 px-3 font-medium">Dimensions</th>
                  <th className="text-right py-2 px-3 font-medium">Area</th>
                  <th className="text-right py-2 px-3 font-medium">Effective</th>
                  <th className="text-left py-2 px-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {cuttings.map((cut, idx) => (
                  <tr
                    key={cut.id}
                    className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors"
                  >
                    <td className="py-2.5 px-3 text-text-muted">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-medium text-text-primary">
                      {cut.jobNumber}
                    </td>
                    <td className="py-2.5 px-3">
                      <TypeBadge type={cut.cuttingType} />
                    </td>
                    <td className="py-2.5 px-3 text-text-secondary">
                      <DimensionLabel type={cut.cuttingType} dims={cut.dimensions} />
                    </td>
                    <td className="py-2.5 px-3 text-right text-text-secondary">
                      {formatArea(cut.cutArea)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-text-muted">
                      {formatArea(cut.effectiveArea)}
                    </td>
                    <td className="py-2.5 px-3 text-text-muted">
                      {new Date(cut.createdAt).toLocaleDateString()}
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

// -- Inline helper components --

function StatRow({ label, value, color = "text-text-primary" }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-text-muted">{label}</span>
      <span className={`font-medium ${color}`}>{value}</span>
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
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.color}`}>
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
