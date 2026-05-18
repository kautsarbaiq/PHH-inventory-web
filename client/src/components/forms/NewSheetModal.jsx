// ============================================================
// PHH Inventory — New Sheet Modal (Goods Receipt Form)
// Refactored: field validation, spacing, theme transitions
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
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!form.sheetNumber.trim()) errors.sheetNumber = "Required";
    if (!form.grade.trim()) errors.grade = "Required";
    if (!form.supplier.trim()) errors.supplier = "Required";
    
    const l = parseFloat(form.length);
    const w = parseFloat(form.width);
    const t = parseFloat(form.thickness);
    const k = parseFloat(form.kerfAllowance);
    
    if (isNaN(l) || l < 5) errors.length = "Min 5 mm";
    if (isNaN(w) || w < 5) errors.width = "Min 5 mm";
    if (isNaN(t) || t < 0.1) errors.thickness = "Min 0.1 mm";
    if (isNaN(k) || k < 0) errors.kerfAllowance = "Min 0 mm";

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) return;

    setLoading(true);
    try {
      await sheetApi.create({
        sheetNumber: form.sheetNumber.trim(),
        grade: form.grade.trim(),
        supplier: form.supplier.trim(),
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

  const inputBase =
    "w-full px-3 py-2.5 bg-bg-elevated border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 transition-all text-sm theme-transition";
  const inputOk = `${inputBase} border-border focus:ring-primary/50 focus:border-primary`;
  const inputErr = `${inputBase} border-danger/50 focus:ring-danger/50 focus:border-danger`;

  const getInputClass = (name) => (fieldErrors[name] ? inputErr : inputOk);

  // Calculated area preview
  const areaPreview = (() => {
    const l = parseFloat(form.length);
    const w = parseFloat(form.width);
    if (l > 0 && w > 0) return (l * w).toLocaleString("en-US");
    return null;
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-bg-surface rounded-2xl border border-border w-full max-w-lg mx-4 shadow-2xl animate-fade-in theme-transition">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary leading-tight">
                New Master Sheet
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Register incoming material
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-lg bg-danger/10 border border-danger/20 text-danger-light text-sm animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Row 1: Sheet # + Grade */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">
                Sheet Number
              </label>
              <input
                name="sheetNumber"
                value={form.sheetNumber}
                onChange={handleChange}
                placeholder="SH-001"
                required
                className={getInputClass("sheetNumber")}
              />
              {fieldErrors.sheetNumber && (
                <p className="text-xs text-danger-light mt-1">{fieldErrors.sheetNumber}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">
                Grade
              </label>
              <input
                name="grade"
                value={form.grade}
                onChange={handleChange}
                placeholder="SS304"
                required
                className={getInputClass("grade")}
              />
              {fieldErrors.grade && (
                <p className="text-xs text-danger-light mt-1">{fieldErrors.grade}</p>
              )}
            </div>
          </div>

          {/* Supplier */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">
              Supplier
            </label>
            <input
              name="supplier"
              value={form.supplier}
              onChange={handleChange}
              placeholder="PT Krakatau Steel"
              required
              className={getInputClass("supplier")}
            />
            {fieldErrors.supplier && (
              <p className="text-xs text-danger-light mt-1">{fieldErrors.supplier}</p>
            )}
          </div>

          {/* Dimensions */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">
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
                className={getInputClass("length")}
              />
              {fieldErrors.length && (
                <p className="text-xs text-danger-light mt-1">{fieldErrors.length}</p>
              )}
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
                placeholder="1000"
                required
                min="5"
                step="any"
                className={getInputClass("width")}
              />
              {fieldErrors.width && (
                <p className="text-xs text-danger-light mt-1">{fieldErrors.width}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">
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
                className={getInputClass("thickness")}
              />
              {fieldErrors.thickness && (
                <p className="text-xs text-danger-light mt-1">{fieldErrors.thickness}</p>
              )}
            </div>
          </div>

          {/* Kerf */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">
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
              className={getInputClass("kerfAllowance")}
            />
            {fieldErrors.kerfAllowance ? (
              <p className="text-xs text-danger-light mt-1">{fieldErrors.kerfAllowance}</p>
            ) : (
              <p className="text-xs text-text-muted mt-1.5">
                Width of material consumed by the cutting tool
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">
              Notes (optional)
            </label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={2}
              placeholder="Additional info..."
              className={inputOk + " resize-none"}
            />
          </div>

          {/* Calculated area preview */}
          {areaPreview && (
            <div className="p-3.5 rounded-lg bg-primary/5 border border-primary/10 text-sm theme-transition">
              <span className="text-text-secondary">Total Area: </span>
              <span className="font-bold text-primary tabular-nums">
                {areaPreview} mm²
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-text-secondary hover:text-text-primary font-medium transition-colors cursor-pointer text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-all duration-150 disabled:opacity-50 cursor-pointer text-sm shadow-sm hover:shadow-md"
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
