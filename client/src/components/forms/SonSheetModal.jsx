// ============================================================
// PHH Inventory — Son Sheet Modal
// ============================================================

import { useState } from "react";
import { sheetApi } from "../../lib/api";
import { AlertCircle, Plus, X, GitBranch } from "lucide-react";

export default function SonSheetModal({ parentSheet, onClose, onCreated }) {
  const [form, setForm] = useState({
    sheetNumber: `${parentSheet.sheetNumber}-S1`,
    length: "",
    width: "",
    thickness: String(parentSheet.thickness),
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await sheetApi.createSon(parentSheet.id, {
        sheetNumber: form.sheetNumber.trim(),
        length: parseFloat(form.length),
        width: parseFloat(form.width),
        thickness: parseFloat(form.thickness),
      });
      onCreated();
    } catch (err) {
      setError(
        err.response?.data?.error || "Failed to create son sheet"
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full h-10 px-3 bg-bg-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm theme-transition";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-md mx-4 theme-transition">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-text-primary">
              Save as Son Sheet
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-text-muted">
            Create a new sheet from remaining material of{" "}
            <span className="font-semibold text-text-secondary">
              {parentSheet.sheetNumber}
            </span>
          </p>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger-light text-sm animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Sheet Number */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">
              Son Sheet Number
            </label>
            <input
              name="sheetNumber"
              value={form.sheetNumber}
              onChange={handleChange}
              required
              className={inputClass}
            />
          </div>

          {/* Dimensions Grid (Thickness first, then Length, then Width) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">
                Thickness (mm)
              </label>
              <input
                name="thickness"
                type="number"
                value={form.thickness}
                onChange={handleChange}
                required
                min="0.1"
                step="any"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">
                Length (mm)
              </label>
              <input
                name="length"
                type="number"
                value={form.length}
                onChange={handleChange}
                placeholder={String(parentSheet.length)}
                required
                min="5"
                step="any"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">
                Width (mm)
              </label>
              <input
                name="width"
                type="number"
                value={form.width}
                onChange={handleChange}
                placeholder={String(parentSheet.width)}
                required
                min="5"
                step="any"
                className={inputClass}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-all text-sm disabled:opacity-50 cursor-pointer shadow-sm hover:shadow-md"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create Son Sheet
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
