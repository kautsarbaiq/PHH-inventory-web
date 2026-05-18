// ============================================================
// PHH Inventory — New Sheet Modal (Goods Receipt Form)
// ============================================================

import { useState } from "react";
import { sheetApi } from "../../lib/api";
import { X, Package, AlertCircle } from "lucide-react";

export default function NewSheetModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    sheetNumber: "",
    grade: "",
    supplier: "",
    length: "",
    width: "",
    thickness: "",
    kerfAllowance: "2",
    notes: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await sheetApi.create({
        sheetNumber: form.sheetNumber,
        grade: form.grade,
        supplier: form.supplier,
        length: parseFloat(form.length),
        width: parseFloat(form.width),
        thickness: parseFloat(form.thickness),
        kerfAllowance: parseFloat(form.kerfAllowance),
        notes: form.notes || undefined,
      });
      onCreated();
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.details ||
        "Failed to create sheet";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2 bg-bg-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-bg-surface rounded-2xl border border-border w-full max-w-lg mx-4 shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-text-primary">
              New Master Sheet
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger-light text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Row 1: Sheet # + Grade */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Sheet Number
              </label>
              <input
                name="sheetNumber"
                value={form.sheetNumber}
                onChange={handleChange}
                placeholder="SH-001"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Grade
              </label>
              <input
                name="grade"
                value={form.grade}
                onChange={handleChange}
                placeholder="SS304"
                required
                className={inputClass}
              />
            </div>
          </div>

          {/* Supplier */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Supplier
            </label>
            <input
              name="supplier"
              value={form.supplier}
              onChange={handleChange}
              placeholder="PT Krakatau Steel"
              required
              className={inputClass}
            />
          </div>

          {/* Dimensions */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Length (mm)
              </label>
              <input
                name="length"
                type="number"
                value={form.length}
                onChange={handleChange}
                placeholder="2000"
                required
                min="5"
                step="any"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Width (mm)
              </label>
              <input
                name="width"
                type="number"
                value={form.width}
                onChange={handleChange}
                placeholder="1000"
                required
                min="5"
                step="any"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Thickness (mm)
              </label>
              <input
                name="thickness"
                type="number"
                value={form.thickness}
                onChange={handleChange}
                placeholder="10"
                required
                min="0.1"
                step="any"
                className={inputClass}
              />
            </div>
          </div>

          {/* Kerf */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Kerf Allowance (mm)
            </label>
            <input
              name="kerfAllowance"
              type="number"
              value={form.kerfAllowance}
              onChange={handleChange}
              placeholder="2"
              min="0"
              step="any"
              className={inputClass}
            />
            <p className="text-xs text-text-muted mt-1">
              Width of material consumed by the cutting tool
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Notes (optional)
            </label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={2}
              placeholder="Additional info..."
              className={inputClass + " resize-none"}
            />
          </div>

          {/* Calculated area preview */}
          {form.length && form.width && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-sm">
              <span className="text-text-secondary">Total Area: </span>
              <span className="font-semibold text-primary">
                {(parseFloat(form.length) * parseFloat(form.width)).toLocaleString()} mm²
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Create Sheet"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
