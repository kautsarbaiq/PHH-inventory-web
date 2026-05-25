// ============================================================
// PHH Inventory — Sheet Detail Page (One-Screen Layout)
// No page scroll — only Cutting History table scrolls
// ============================================================

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { sheetApi, cuttingApi } from "../lib/api";
import { formatArea, formatPercent, calculateWeight, formatWeight } from "../lib/calculations";
import {
  ArrowLeft,
  Ruler,
  Scissors,
  BarChart3,
  Clock,
  AlertTriangle,
  RefreshCw,
  GitBranch,
  Trash2,
  Sliders,
  Archive,
  ChevronDown,
  ChevronUp,
  Edit2,
  Check,
  X,
  Settings2,
} from "lucide-react";
import MasterSheetCanvas from "../components/canvas/MasterSheetCanvas";
import CuttingOrderForm from "../components/forms/CuttingOrderForm";
import UsageDonutChart from "../components/dashboard/UsageDonutChart";
import GenealogyTree from "../components/sheet/GenealogyTree";
import CuttingHistoryModal from "../components/sheet/CuttingHistoryModal";
import SelectCuttingModal from "../components/forms/SelectCuttingModal";
import EditSheetModal from "../components/forms/EditSheetModal";

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
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showEditSheetModal, setShowEditSheetModal] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [isEditingUsage, setIsEditingUsage] = useState(false);
  const [newUsagePct, setNewUsagePct] = useState("");
  const historyRef = useRef(null);

  const handleArchiveSheet = async () => {
    if (!window.confirm("Are you sure you want to archive this sheet? It will be moved to the archives and can be restored later.")) return;
    try {
      await sheetApi.archive(id);
      navigate("/dashboard");
    } catch (err) {
      console.error("Failed to archive sheet:", err);
      alert(err.response?.data?.error || "Failed to archive sheet");
    }
  };

  const handleDeleteSheetPermanent = async () => {
    if (!window.confirm("Are you sure you want to permanently delete this sheet? This action CANNOT be undone and all associated cuttings will be permanently deleted!")) return;
    try {
      await sheetApi.deletePermanent(id);
      navigate("/dashboard");
    } catch (err) {
      console.error("Failed to delete sheet permanently:", err);
      alert(err.response?.data?.error || "Failed to permanently delete sheet");
    }
  };

  const handleRemoveCutting = async (cuttingId) => {
    if (!window.confirm("Are you sure you want to delete this cutting job? The sheet area will be recalculated.")) return;
    try {
      await cuttingApi.remove(id, cuttingId);
      fetchData();
    } catch (err) {
      console.error("Failed to remove cutting:", err);
      alert(err.response?.data?.error || "Failed to remove cutting order");
    }
  };

  const handleMakeSonFromCutting = async (cutting) => {
    const defaultName = `${sheet.sheetNumber}-SON-${cutting.jobNumber.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()}`;
    const customName = window.prompt("Enter a custom name for this Son Sheet (a 4-character unique ID will be appended):", defaultName);
    
    if (customName === null) return;
    
    try {
      const res = await sheetApi.createSonFromCutting(id, cutting.id, customName);
      fetchData();
      alert(`Son Sheet successfully created!\nNew ID: ${res.data.data.sheetNumber}`);
    } catch (err) {
      console.error("Failed to create son sheet:", err);
      alert(err.response?.data?.error || "Failed to create Son Sheet");
    }
  };

  const startEditingUsage = () => {
    setNewUsagePct(sheet.usedPercentage?.toString() || "0");
    setIsEditingUsage(true);
  };

  const handleSaveUsage = async () => {
    const pct = parseFloat(newUsagePct);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      alert("Please enter a valid percentage between 0 and 100.");
      return;
    }
    const newUsedArea = sheet.totalArea * (pct / 100);
    try {
      await sheetApi.update(id, { usedArea: newUsedArea, isManualUsage: true });
      setIsEditingUsage(false);
      fetchData();
    } catch (err) {
      console.error("Failed to update usage:", err);
      alert(err?.response?.data?.error || "Failed to update usage");
    }
  };

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
      setError("Failed to load sheet data. Please check your connection.");
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

  const totalWeight = calculateWeight(sheet);
  const usedWeight = totalWeight * (usedPct / 100);
  const availWeight = totalWeight * (availPct / 100);
  const scrapWeight = totalWeight * (scrapPct / 100);

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
            {sheet.density > 0 && (
              <>
                {" "}•{" "}
                <span className="font-semibold text-text-primary" title="Material Density">
                  {(sheet.density * 1000000).toFixed(2)} g/cm³
                </span>
              </>
            )}
            {" "}•{" "}
            <span className="font-semibold text-primary">
              {formatWeight(calculateWeight(sheet))}
            </span>
          </p>
        </div>
        
        {/* Edit Sheet Button */}
        <button
          onClick={() => setShowEditSheetModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-text-secondary bg-bg-elevated hover:bg-bg-elevated/80 rounded-lg transition-colors cursor-pointer shrink-0 border border-border"
        >
          <Settings2 className="w-3.5 h-3.5" />
          Edit Sheet
        </button>

        {/* Son Sheet Button */}
        <button
          onClick={() => setShowSonModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors cursor-pointer shrink-0"
        >
          <GitBranch className="w-3.5 h-3.5" />
          Save as Son
        </button>

        {/* Archive Sheet Button */}
        <button
          onClick={handleArchiveSheet}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-warning bg-warning/10 hover:bg-warning/20 rounded-lg transition-colors cursor-pointer shrink-0"
        >
          <Archive className="w-3.5 h-3.5" />
          Archive Sheet
        </button>

        {/* Delete Sheet Button */}
        <button
          onClick={handleDeleteSheetPermanent}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-danger bg-danger/10 hover:bg-danger/20 rounded-lg transition-colors cursor-pointer shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete Sheet
        </button>
      </div>

      {/* ═══ Row 2: Main workspace (scrollable vertically on small viewports) ═══ */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {/* Top section: Canvas + Stats side-by-side */}
        <div className="shrink-0 grid grid-cols-1 lg:grid-cols-4 gap-3 p-3">
          {/* Left Column: Canvas + History (3/4) */}
          <div className="lg:col-span-3 flex flex-col gap-3 min-w-0">
            {/* Canvas Card */}
            <div className="bg-bg-surface rounded-xl border border-border p-3 theme-transition">
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

            {/* Cutting History Card */}
            <div ref={historyRef} className="bg-bg-surface rounded-xl border border-border p-4 theme-transition">
              <h2 className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Scissors className="w-3 h-3 text-primary" /> Cutting History ({cuttings.length})
              </h2>
              {cuttings.length === 0 ? (
                <div className="text-center py-6 text-text-muted text-xs">
                  No cutting orders placed yet. Use the form below to add one.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border text-text-muted font-medium uppercase tracking-wider text-[9px]">
                        <th className="py-2 px-2 text-center w-12">No.</th>
                        <th className="py-2 px-2">Job Number</th>
                        <th className="py-2 px-2">Type</th>
                        <th className="py-2 px-2">Dimensions</th>
                        <th className="py-2 px-2">Area</th>
                        <th className="py-2 px-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 text-text-secondary font-medium">
                      {(historyExpanded ? cuttings : cuttings.slice(0, 3)).map((cut, idx) => {
                        const originalIndex = cuttings.indexOf(cut) + 1;
                        return (
                          <tr key={cut.id} className="hover:bg-bg-elevated/30 transition-colors">
                            <td className="py-2.5 px-2 text-center text-text-muted font-semibold font-mono text-[10px]">
                              #{originalIndex}
                            </td>
                            <td className="py-2.5 px-2 font-semibold text-text-primary">
                              {cut.jobNumber}
                            </td>
                            <td className="py-2.5 px-2">
                              <TypeBadge type={cut.cuttingType} />
                            </td>
                            <td className="py-2.5 px-2">
                              <DimensionLabel type={cut.cuttingType} dims={cut.dimensions} />
                            </td>
                            <td className="py-2.5 px-2">
                              {formatArea(cut.cutArea)}
                            </td>
                            <td className="py-2.5 px-2 text-right flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleMakeSonFromCutting(cut)}
                                className="px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary transition-colors text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                                title="Create Son Sheet from this cutting"
                              >
                                <GitBranch className="w-3 h-3" />
                                Make Son
                              </button>
                              <button
                                onClick={() => handleRemoveCutting(cut.id)}
                                className="p-1 rounded hover:bg-danger/10 text-text-muted hover:text-danger transition-colors cursor-pointer"
                                title="Delete cutting job"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  
                  {cuttings.length > 3 && (
                    <div className="flex justify-center mt-3 pt-3 border-t border-border/30">
                      <div className="relative group">
                        <button
                          onClick={() => setHistoryExpanded(!historyExpanded)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-bg-surface hover:bg-bg-elevated hover:border-primary/40 hover:text-primary transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md hover:scale-[1.02] text-xs font-semibold text-text-secondary"
                        >
                          {historyExpanded ? (
                            <>
                              Show Less <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                            </>
                          ) : (
                            <>
                              Show More ({cuttings.length - 3} more) <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                            </>
                          )}
                        </button>
                        
                        {/* Hover Preview Dropdown */}
                        {!historyExpanded && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 hidden group-hover:block w-80 bg-bg-surface/95 backdrop-blur-md border border-border rounded-xl shadow-2xl p-3 z-50 animate-fade-in divide-y divide-border/40 pointer-events-none group-hover:pointer-events-auto">
                            <div className="pb-2 mb-2 text-center">
                              <p className="text-[10px] font-bold text-text-primary uppercase tracking-wider">Remaining Cuttings</p>
                              <p className="text-[9px] text-text-muted">Hovering list of items beyond the top 3</p>
                            </div>
                            <div className="max-h-56 overflow-y-auto space-y-2 pt-2 scrollbar-thin">
                              {cuttings.slice(3).map((cut, idx) => {
                                const originalIndex = idx + 4;
                                return (
                                  <div key={cut.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-bg-elevated/40 transition-colors">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-semibold font-mono text-text-muted">#{originalIndex}</span>
                                      <div className="text-left">
                                        <p className="text-[11px] font-bold text-text-primary leading-tight">{cut.jobNumber}</p>
                                        <p className="text-[9px] text-text-muted text-left">
                                          <DimensionLabel type={cut.cuttingType} dims={cut.dimensions} />
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-right">
                                      <TypeBadge type={cut.cuttingType} />
                                      <span className="text-[10px] font-semibold text-text-secondary">{formatArea(cut.cutArea)}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="pt-2 mt-2 text-center text-[9px] text-text-muted italic">
                              Click to expand permanently inside table
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
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
                <StatRow label="Density" value={sheet.density > 0 ? `${(sheet.density * 1000000).toFixed(3)} g/cm³` : "—"} />
                <StatRow label="Total" value={formatArea(sheet.totalArea)} />
                
                <div className="flex justify-between items-center group">
                  <span className="text-text-muted font-medium flex items-center gap-1">
                    Used
                    <button onClick={startEditingUsage} className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-bg-elevated rounded text-text-muted hover:text-primary transition-all" title="Edit Usage">
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </span>
                  {isEditingUsage ? (
                    <div className="flex items-center gap-1">
                      <input 
                        type="number" 
                        value={newUsagePct} 
                        onChange={(e) => setNewUsagePct(e.target.value)}
                        className="w-16 px-1 py-0.5 text-xs bg-bg-surface border border-border rounded text-right focus:outline-none focus:border-primary"
                        autoFocus
                        step="0.1"
                      />
                      <span className="text-xs text-text-muted">%</span>
                      <button onClick={handleSaveUsage} className="p-0.5 text-primary hover:bg-primary/10 rounded">
                        <Check className="w-3 h-3" />
                      </button>
                      <button onClick={() => setIsEditingUsage(false)} className="p-0.5 text-text-muted hover:text-danger hover:bg-danger/10 rounded">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <span className="font-semibold text-danger tabular-nums">
                      {formatArea(sheet.usedArea || 0)}
                      {sheet.isManualUsage && <span className="ml-1 text-[9px] text-warning" title="Manual Usage Override">(M)</span>}
                    </span>
                  )}
                </div>

                <StatRow label="Available" value={formatArea(sheet.availableArea || 0)} color="text-primary" />
                <StatRow label="Scrap" value={formatArea(sheet.scrapArea || 0)} color="text-scrap" />
                <div className="border-t border-border/50 pt-1.5 space-y-1.5">
                  <StatRow label="Total Weight" value={formatWeight(totalWeight)} />
                  <StatRow label="Used Weight" value={formatWeight(usedWeight)} color="text-danger" />
                  <StatRow label="Available Weight" value={formatWeight(availWeight)} color="text-primary" />
                  <StatRow label="Scrap Weight" value={formatWeight(scrapWeight)} color="text-scrap" />
                </div>
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
            onViewHistory={() => historyRef.current?.scrollIntoView({ behavior: "smooth" })}
            cuttingsCount={cuttings.length}
          />
        </div>
      </div>

      {/* Son Sheet Modal */}
      {showSonModal && (
        <SelectCuttingModal
          sheetId={sheet.id}
          sheetNumber={sheet.sheetNumber}
          cuttings={cuttings}
          onClose={() => setShowSonModal(false)}
          onCreated={() => {
            setShowSonModal(false);
            fetchData();
          }}
        />
      )}

      {/* Cutting History Modal */}
      {showHistoryModal && (
        <CuttingHistoryModal
          sheet={sheet}
          cuttings={cuttings}
          onClose={() => setShowHistoryModal(false)}
          onDeleteCutting={handleRemoveCutting}
          onUpdateCutting={fetchData}
        />
      )}

      {/* Edit Sheet Modal */}
      {showEditSheetModal && (
        <EditSheetModal
          sheet={sheet}
          onClose={() => setShowEditSheetModal(false)}
          onUpdated={() => {
            setShowEditSheetModal(false);
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
