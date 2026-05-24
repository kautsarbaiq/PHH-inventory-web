import { useState } from "react";
import { X, Edit2, Check, Trash2, Sliders, AlertCircle } from "lucide-react";
import { cuttingApi } from "../../lib/api";
import { formatArea } from "../../lib/calculations";

export default function CuttingHistoryModal({ sheet, cuttings, onClose, onDeleteCutting, onUpdateCutting }) {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    jobNumber: "",
    notes: "",
    length: "",
    width: "",
    radius: "",
    base: "",
    height: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const startEdit = (cut) => {
    setError("");
    setEditingId(cut.id);
    const dims = cut.dimensions || {};
    setEditForm({
      jobNumber: cut.jobNumber,
      notes: cut.notes || "",
      length: String(dims.length || ""),
      width: String(dims.width || ""),
      radius: String(dims.radius || ""),
      base: String(dims.base || ""),
      height: String(dims.height || ""),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setError("");
  };

  const handleSave = async (cut) => {
    setError("");
    setLoading(true);

    try {
      // Build updated dimensions object based on type
      let dims = {};
      if (cut.cuttingType === "rectangle") {
        const l = parseFloat(editForm.length);
        const w = parseFloat(editForm.width);
        if (isNaN(l) || l <= 0 || isNaN(w) || w <= 0) {
          throw new Error("Dimensi Length dan Width harus bernilai positif");
        }
        dims = { length: l, width: w };
      } else if (cut.cuttingType === "circle") {
        const r = parseFloat(editForm.radius);
        if (isNaN(r) || r <= 0) {
          throw new Error("Dimensi Radius harus bernilai positif");
        }
        dims = { radius: r };
      } else if (cut.cuttingType === "triangle") {
        const b = parseFloat(editForm.base);
        const h = parseFloat(editForm.height);
        if (isNaN(b) || b <= 0 || isNaN(h) || h <= 0) {
          throw new Error("Dimensi Base dan Height harus bernilai positif");
        }
        dims = { base: b, height: h };
      }

      await cuttingApi.update(sheet.id, cut.id, {
        jobNumber: editForm.jobNumber.trim(),
        notes: editForm.notes.trim() || undefined,
        dimensions: dims,
      });

      setEditingId(null);
      onUpdateCutting(); // Trigger reload in parent!
    } catch (err) {
      console.error("Failed to update cutting:", err);
      const msg = err.response?.data?.error || err.message || "Gagal mengupdate cutting";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-bg-surface border border-border w-full max-w-4xl mx-4 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] animate-fade-in theme-transition">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sliders className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary leading-tight">
                Riwayat & Kustomisasi Pemotongan
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Kustomisasi parameter dimensi, nama job, catatan, atau hapus potongan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Warning */}
        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2.5 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger-light text-sm animate-fade-in shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Table Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {cuttings.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-text-muted">
              <Sliders className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm font-semibold">Belum ada pemotongan pada sheet ini</p>
            </div>
          ) : (
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-text-secondary font-semibold bg-bg-elevated/40 theme-transition">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Job Number</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Dimensi (mm)</th>
                  <th className="py-2.5 px-3 text-right">Area</th>
                  <th className="py-2.5 px-3">Notes</th>
                  <th className="py-2.5 px-3 text-right w-24">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {cuttings.map((cut, idx) => {
                  const isEditing = editingId === cut.id;
                  const dims = cut.dimensions || {};

                  return (
                    <tr
                      key={cut.id}
                      className="border-b border-border/30 hover:bg-bg-elevated/20 transition-colors theme-transition align-middle animate-fade-in"
                    >
                      <td className="py-3 px-3 text-text-muted font-medium">{idx + 1}</td>
                      
                      {/* Job Number column */}
                      <td className="py-3 px-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.jobNumber}
                            onChange={(e) => setEditForm(prev => ({ ...prev, jobNumber: e.target.value }))}
                            className="w-full h-8 px-2 bg-bg-elevated border border-border rounded text-text-primary focus:outline-none focus:ring-1 focus:ring-primary font-semibold text-xs"
                          />
                        ) : (
                          <span className="font-semibold text-text-primary">{cut.jobNumber}</span>
                        )}
                      </td>

                      {/* Cutting Type column */}
                      <td className="py-3 px-3">
                        <TypeBadge type={cut.cuttingType} />
                      </td>

                      {/* Dimensions column */}
                      <td className="py-3 px-3 font-medium">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 max-w-[180px]">
                            {cut.cuttingType === "rectangle" && (
                              <>
                                <input
                                  type="number"
                                  placeholder="L"
                                  value={editForm.length}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, length: e.target.value }))}
                                  className="w-16 h-8 px-1.5 bg-bg-elevated border border-border rounded text-text-primary text-xs"
                                />
                                <span className="text-text-muted">×</span>
                                <input
                                  type="number"
                                  placeholder="W"
                                  value={editForm.width}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, width: e.target.value }))}
                                  className="w-16 h-8 px-1.5 bg-bg-elevated border border-border rounded text-text-primary text-xs"
                                />
                              </>
                            )}
                            {cut.cuttingType === "circle" && (
                              <input
                                type="number"
                                placeholder="R"
                                value={editForm.radius}
                                onChange={(e) => setEditForm(prev => ({ ...prev, radius: e.target.value }))}
                                className="w-20 h-8 px-1.5 bg-bg-elevated border border-border rounded text-text-primary text-xs"
                              />
                            )}
                            {cut.cuttingType === "triangle" && (
                              <>
                                <input
                                  type="number"
                                  placeholder="B"
                                  value={editForm.base}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, base: e.target.value }))}
                                  className="w-16 h-8 px-1.5 bg-bg-elevated border border-border rounded text-text-primary text-xs"
                                />
                                <span className="text-text-muted">×</span>
                                <input
                                  type="number"
                                  placeholder="H"
                                  value={editForm.height}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, height: e.target.value }))}
                                  className="w-16 h-8 px-1.5 bg-bg-elevated border border-border rounded text-text-primary text-xs"
                                />
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-text-secondary">
                            <DimensionLabel type={cut.cuttingType} dims={dims} />
                          </span>
                        )}
                      </td>

                      {/* Area column */}
                      <td className="py-3 px-3 text-right tabular-nums text-text-secondary font-medium">
                        {formatArea(cut.cutArea)}
                      </td>

                      {/* Notes column */}
                      <td className="py-3 px-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.notes}
                            onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                            placeholder="Catatan..."
                            className="w-full h-8 px-2 bg-bg-elevated border border-border rounded text-text-primary focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                          />
                        ) : (
                          <span className="text-text-muted italic">{cut.notes || "—"}</span>
                        )}
                      </td>

                      {/* Action buttons column */}
                      <td className="py-3 px-3 text-right shrink-0">
                        {isEditing ? (
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleSave(cut)}
                              disabled={loading}
                              className="p-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded transition-colors cursor-pointer"
                              title="Simpan Perubahan"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1.5 bg-bg-elevated text-text-secondary hover:text-text-primary rounded transition-colors cursor-pointer"
                              title="Batal"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => startEdit(cut)}
                              className="p-1.5 hover:bg-bg-elevated text-text-muted hover:text-text-primary rounded transition-colors cursor-pointer"
                              title="Edit/Kustomisasi Potongan"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteCutting(cut.id)}
                              className="p-1.5 hover:bg-danger/10 text-text-muted hover:text-danger rounded transition-colors cursor-pointer"
                              title="Hapus Potongan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-border shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 h-10 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-colors cursor-pointer text-xs"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Inline helper components for Modal ──

const TYPE_STYLES = {
  rectangle: { label: "▭ Rect", color: "text-shape-rect", bg: "bg-shape-rect/10" },
  circle: { label: "⭕ Circle", color: "text-shape-circle", bg: "bg-shape-circle/10" },
  triangle: { label: "△ Tri", color: "text-shape-triangle", bg: "bg-shape-triangle/10" },
};

function TypeBadge({ type }) {
  const style = TYPE_STYLES[type] || TYPE_STYLES.rectangle;
  return (
    <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-semibold ${style.bg} ${style.color}`}>
      {style.label}
    </span>
  );
}

function DimensionLabel({ type, dims }) {
  if (!dims) return "—";
  switch (type) {
    case "rectangle": return `${dims.length}×${dims.width}`;
    case "circle": return `r=${dims.radius}`;
    case "triangle": return `${dims.base}×${dims.height}`;
    default: return "—";
  }
}
