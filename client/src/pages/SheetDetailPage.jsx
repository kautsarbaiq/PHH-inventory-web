// ============================================================
// PHH Inventory — Sheet Detail Page (One-Screen Layout)
// No page scroll — only Cutting History table scrolls
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
  GitBranch,
} from "lucide-react";
import MasterSheetCanvas from "../components/canvas/MasterSheetCanvas";
import CuttingOrderForm from "../components/forms/CuttingOrderForm";
import UsageDonutChart from "../components/dashboard/UsageDonutChart";
import GenealogyTree from "../components/sheet/GenealogyTree";
import SonSheetModal from "../components/forms/SonSheetModal";

export default function SheetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState(null);
  const [cuttings, setCuttings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newCuttingPreview, setNewCuttingPreview] = useState(null);
  const [genealogy, setGenealogy] = useState(null);
  const [showSonModal, setShowSonModal] = useState(false);

  const handlePreviewChange = useCallback((formData) => {
    if (!formData) {
      setNewCuttingPreview(null);
      return;
    }
    let dims = {};
    const l = parseFloat(formData.length);
    const w = parseFloat(formData.width);
    const r = parseFloat(formData.radius);
    const b = parseFloat(formData.base);
    const h = parseFloat(formData.height);
    if (formData.cuttingType === "rectangle") dims = { length: l, width: w };
    else if (formData.cuttingType === "circle") dims = { radius: r };
    else if (formData.cuttingType === "triangle") dims = { base: b, height: h };
    setNewCuttingPreview({
      cuttingType: formData.cuttingType,
      dimensions: dims,
      positionX: parseFloat(formData.positionX) || 0,
      positionY: parseFloat(formData.positionY) || 0,
      jobNumber: formData.jobNumber || "Draft",
    });
  }, []);

  const fetchData = useCallback(async () => {
    setError("");
    try {
      const [sheetRes, cuttingsRes, genealogyRes] = await Promise.all([
        sheetApi.getById(id),
        cuttingApi.list(id),
        sheetApi.getGenealogy(id).catch(() => ({ data: { data: null } })),
      ]);
      setSheet(sheetRes.data.data);
      setCuttings(cuttingsRes.data.data || []);
      setGenealogy(genealogyRes.data.data || null);
    } catch (err) {
      console.error("Failed to load sheet:", err);
      setError("Gagal memuat data sheet. Periksa koneksi server.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const handleCuttingCreated = () => fetchData();

  const handlePositionUpdate = async (cuttingId, newPos) => {
    try {
      await cuttingApi.updatePosition(id, cuttingId, newPos);
      fetchData();
    } catch (err) {
      console.error("Position update failed:", err);
      fetchData();
    }
  };

  const handleGenealogySelect = (sheetId) => {
    if (sheetId !== id) {
      navigate(`/sheets/${sheetId}`);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-text-muted text-sm">Loading sheet...</p>
        </div>
      </div>
    );
  }

  // ── Not found / Error ──
  if (!sheet) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-text-muted">
        <AlertTriangle className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-base font-semibold text-text-secondary">
          {error || "Sheet not found"}
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          className="mt-3 text-primary hover:text-primary-light transition-colors cursor-pointer text-sm font-medium"
        >
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  const usedPct = sheet.usedPercentage || 0;
  const availPct = sheet.availablePercentage || 0;
  const scrapPct =
    sheet.totalArea > 0 ? ((sheet.scrapArea || 0) / sheet.totalArea) * 100 : 0;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* ═══ Row 1: Header bar (fixed) ═══ */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-border bg-bg-surface theme-transition">
        <button
          onClick={() => navigate("/dashboard")}
          className="p-1.5 rounded-lg hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-text-primary leading-tight truncate">
            {sheet.sheetNumber}
          </h1>
          <p className="text-text-secondary text-xs truncate">
            {sheet.grade} • {sheet.supplier} •{" "}
            <span className="font-medium">
              {sheet.length}×{sheet.width}×{sheet.thickness} mm
            </span>
          </p>
        </div>
        {/* Son Sheet Button */}
        <button
          onClick={() => setShowSonModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors cursor-pointer shrink-0"
        >
          <GitBranch className="w-3.5 h-3.5" />
          Save as Son
        </button>
      </div>

      {/* ═══ Row 2: Main workspace (fills remaining height) ═══ */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* Top section: Canvas + Stats side-by-side */}
        <div className="shrink-0 grid grid-cols-1 lg:grid-cols-4 gap-3 p-3">
          {/* Canvas (3/4) */}
          <div className="lg:col-span-3 bg-bg-surface rounded-xl border border-border p-3 theme-transition">
            <h2 className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Ruler className="w-3 h-3" /> Visual Canvas
            </h2>
            <MasterSheetCanvas
              sheet={sheet}
              cuttings={cuttings}
              onPositionUpdate={handlePositionUpdate}
              newCuttingPreview={newCuttingPreview}
            />
          </div>

          {/* Stats sidebar (1/4) */}
          <div className="flex flex-col gap-3 min-h-0 overflow-y-auto">
            {/* Donut Chart */}
            <div className="bg-bg-surface rounded-xl border border-border p-3 theme-transition">
              <h2 className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <BarChart3 className="w-3 h-3" /> Usage
              </h2>
              <UsageDonutChart
                usedPercent={usedPct}
                availablePercent={availPct}
                scrapPercent={scrapPct}
              />
              <div className="space-y-1.5 mt-3 pt-3 border-t border-border/50 text-xs">
                <StatRow label="Total" value={formatArea(sheet.totalArea)} />
                <StatRow label="Used" value={formatArea(sheet.usedArea || 0)} color="text-danger" />
                <StatRow label="Available" value={formatArea(sheet.availableArea || 0)} color="text-primary" />
                <StatRow label="Scrap" value={formatArea(sheet.scrapArea || 0)} color="text-scrap" />
                <div className="border-t border-border/50 pt-1.5 space-y-1.5">
                  <StatRow label="Cuts" value={sheet.cuttingCount || 0} />
                  <StatRow label="Kerf" value={`${sheet.kerfAllowance} mm`} />
                </div>
              </div>
            </div>

            {/* Genealogy Tree */}
            {genealogy && (
              <div className="bg-bg-surface rounded-xl border border-border p-3 theme-transition">
                <GenealogyTree
                  tree={genealogy}
                  currentId={id}
                  onSelect={handleGenealogySelect}
                />
              </div>
            )}
          </div>
        </div>

        {/* Cutting Form (compact, fixed) */}
        <div className="shrink-0 bg-bg-surface border-t border-b border-border px-4 py-2.5 theme-transition">
          <h2 className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Scissors className="w-3 h-3" /> New Cutting Order
          </h2>
          <CuttingOrderForm
            sheetId={id}
            sheet={sheet}
            onCreated={handleCuttingCreated}
            onPreviewChange={handlePreviewChange}
          />
        </div>

        {/* Cutting History (SCROLLABLE — only this section scrolls) */}
        <div className="flex-1 min-h-0 flex flex-col bg-bg-surface theme-transition">
          <div className="shrink-0 px-4 pt-2.5 pb-1.5">
            <h2 className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Cutting History ({cuttings.length})
            </h2>
          </div>
          {cuttings.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-text-muted py-6">
              <Scissors className="w-8 h-8 mb-2 opacity-20" />
              <p className="text-xs font-medium">No cuttings yet</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-4 pb-3">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-bg-elevated/80 backdrop-blur-sm border-b border-border theme-transition">
                    <th className="text-left py-2 px-3 font-semibold text-text-secondary uppercase tracking-wider">#</th>
                    <th className="text-left py-2 px-3 font-semibold text-text-secondary uppercase tracking-wider">Job #</th>
                    <th className="text-left py-2 px-3 font-semibold text-text-secondary uppercase tracking-wider">Type</th>
                    <th className="text-left py-2 px-3 font-semibold text-text-secondary uppercase tracking-wider">Dimensions</th>
                    <th className="text-right py-2 px-3 font-semibold text-text-secondary uppercase tracking-wider">Area</th>
                    <th className="text-right py-2 px-3 font-semibold text-text-secondary uppercase tracking-wider">Effective</th>
                    <th className="text-left py-2 px-3 font-semibold text-text-secondary uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {cuttings.map((cut, idx) => (
                    <tr
                      key={cut.id}
                      className="border-b border-border/30 hover:bg-bg-elevated/30 transition-colors theme-transition"
                    >
                      <td className="py-2 px-3 text-text-muted font-medium">{idx + 1}</td>
                      <td className="py-2 px-3 font-semibold text-text-primary">{cut.jobNumber}</td>
                      <td className="py-2 px-3"><TypeBadge type={cut.cuttingType} /></td>
                      <td className="py-2 px-3 text-text-secondary font-medium">
                        <DimensionLabel type={cut.cuttingType} dims={cut.dimensions} />
                      </td>
                      <td className="py-2 px-3 text-right text-text-secondary tabular-nums">{formatArea(cut.cutArea)}</td>
                      <td className="py-2 px-3 text-right text-text-muted tabular-nums">{formatArea(cut.effectiveArea)}</td>
                      <td className="py-2 px-3 text-text-muted tabular-nums">
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

      {/* Son Sheet Modal */}
      {showSonModal && (
        <SonSheetModal
          parentSheet={sheet}
          onClose={() => setShowSonModal(false)}
          onCreated={() => {
            setShowSonModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

// ── Inline helper components ──

function StatRow({ label, value, color = "text-text-primary" }) {
  return (
    <div className="flex justify-between items-center">
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
    <span className={`inline-flex items-center justify-center px-2 py-1 rounded-md text-[10px] font-semibold tracking-wide ${style.bg} ${style.color}`}>
      {style.label}
    </span>
  );
}

function DimensionLabel({ type, dims }) {
  if (!dims) return "—";
  switch (type) {
    case "rectangle": return `${dims.length}×${dims.width} mm`;
    case "circle": return `r=${dims.radius} mm`;
    case "triangle": return `${dims.base}×${dims.height} mm`;
    default: return "—";
  }
}
