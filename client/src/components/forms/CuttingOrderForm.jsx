// ============================================================
// PHH Inventory — Dynamic Cutting Order Form
// Refactored: client-side validation, field-level errors,
// improved spacing, loading states, success feedback
// ============================================================

import { useState, useMemo, useEffect } from "react";
import { cuttingApi } from "../../lib/api";
import { calculateCutArea, formatArea } from "../../lib/calculations";
import { AlertCircle, Plus, CheckCircle2 } from "lucide-react";

const CUTTING_TYPES = [
  { value: "rectangle", label: "▭ Rectangle" },
  { value: "circle", label: "⭕ Circle" },
  { value: "triangle", label: "△ Triangle" },
];

export default function CuttingOrderForm({ sheetId, sheet, onCreated, onPreviewChange }) {
  const [form, setForm] = useState({
    jobNumber: "",
    cuttingType: "rectangle",
    length: "",
    width: "",
    radius: "",
    base: "",
    height: "",
    positionX: "0",
    positionY: "0",
    notes: "",
  });

  useEffect(() => {
    if (onPreviewChange) {
      onPreviewChange(form);
    }
  }, [form, onPreviewChange]);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear field error on change
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  // Build dimensions based on type
  const getDimensions = () => {
    switch (form.cuttingType) {
      case "rectangle":
        return { length: parseFloat(form.length), width: parseFloat(form.width) };
      case "circle":
        return { radius: parseFloat(form.radius) };
      case "triangle":
        return { base: parseFloat(form.base), height: parseFloat(form.height) };
      default:
        return {};
    }
  };

  // Preview area
  const previewArea = useMemo(() => {
    try {
      const dims = getDimensions();
      return calculateCutArea(form.cuttingType, dims);
    } catch {
      return 0;
    }
  }, [form.cuttingType, form.length, form.width, form.radius, form.base, form.height]);

  // ── Client-side validation before submit ──
  const validateForm = () => {
    const errors = {};

    if (!form.jobNumber.trim()) {
      errors.jobNumber = "Job number is required";
    }

    const posX = parseFloat(form.positionX);
    const posY = parseFloat(form.positionY);

    if (isNaN(posX) || posX < 0) {
      errors.positionX = "Must be ≥ 0";
    }
    if (isNaN(posY) || posY < 0) {
      errors.positionY = "Must be ≥ 0";
    }

    switch (form.cuttingType) {
      case "rectangle": {
        const l = parseFloat(form.length);
        const w = parseFloat(form.width);
        if (isNaN(l) || l < 5) errors.length = "Min 5 mm";
        if (isNaN(w) || w < 5) errors.width = "Min 5 mm";
        if (l > sheet.length) errors.length = `Max ${sheet.length} mm`;
        if (w > sheet.width) errors.width = `Max ${sheet.width} mm`;
        break;
      }
      case "circle": {
        const r = parseFloat(form.radius);
        if (isNaN(r) || r < 2.5) errors.radius = "Min 2.5 mm";
        if (r * 2 > Math.min(sheet.length, sheet.width))
          errors.radius = `Max ${Math.min(sheet.length, sheet.width) / 2} mm`;
        break;
      }
      case "triangle": {
        const b = parseFloat(form.base);
        const h = parseFloat(form.height);
        if (isNaN(b) || b < 5) errors.base = "Min 5 mm";
        if (isNaN(h) || h < 5) errors.height = "Min 5 mm";
        if (b > sheet.length) errors.base = `Max ${sheet.length} mm`;
        if (h > sheet.width) errors.height = `Max ${sheet.width} mm`;
        break;
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!validateForm()) return;

    setLoading(true);
    try {
      const dimensions = getDimensions();
      await cuttingApi.create(sheetId, {
        jobNumber: form.jobNumber.trim(),
        cuttingType: form.cuttingType,
        dimensions,
        positionX: parseFloat(form.positionX) || 0,
        positionY: parseFloat(form.positionY) || 0,
        notes: form.notes || undefined,
      });
      // Reset form
      setForm({
        jobNumber: "",
        cuttingType: "rectangle",
        length: "",
        width: "",
        radius: "",
        base: "",
        height: "",
        positionX: "0",
        positionY: "0",
        notes: "",
      });
      setFieldErrors({});
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      onCreated();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create cutting");
    } finally {
      setLoading(false);
    }
  };

  const inputBase =
    "w-full h-11 px-3 bg-bg-elevated border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 transition-all text-sm theme-transition";
  const inputOk = `${inputBase} border-border focus:ring-primary/50 focus:border-primary hover:border-text-muted`;
  const inputErr = `${inputBase} border-danger/50 focus:ring-danger/50 focus:border-danger`;

  const getInputClass = (name) => (fieldErrors[name] ? inputErr : inputOk);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Server error */}
      {error && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-lg bg-danger/10 border border-danger/20 text-danger-light text-sm animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success feedback */}
      {success && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-lg bg-success/10 border border-success/20 text-success-light text-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Cutting berhasil ditambahkan!</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 items-start">
        {/* Job # */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">
            Job #
          </label>
          <input
            name="jobNumber"
            value={form.jobNumber}
            onChange={handleChange}
            placeholder="J-001"
            required
            className={getInputClass("jobNumber")}
          />
          {fieldErrors.jobNumber && (
            <p className="text-xs text-danger-light mt-1">{fieldErrors.jobNumber}</p>
          )}
        </div>

        {/* Cutting Type */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">
            Type
          </label>
          <select
            name="cuttingType"
            value={form.cuttingType}
            onChange={handleChange}
            className={inputOk + " cursor-pointer"}
          >
            {CUTTING_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Dynamic dimension fields */}
        {form.cuttingType === "rectangle" && (
          <>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">
                Length (mm)
              </label>
              <input
                name="length"
                type="number"
                value={form.length}
                onChange={handleChange}
                placeholder="100"
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
                placeholder="50"
                required
                min="5"
                step="any"
                className={getInputClass("width")}
              />
              {fieldErrors.width && (
                <p className="text-xs text-danger-light mt-1">{fieldErrors.width}</p>
              )}
            </div>
          </>
        )}

        {form.cuttingType === "circle" && (
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">
              Radius (mm)
            </label>
            <input
              name="radius"
              type="number"
              value={form.radius}
              onChange={handleChange}
              placeholder="30"
              required
              min="2.5"
              step="any"
              className={getInputClass("radius")}
            />
            {fieldErrors.radius && (
              <p className="text-xs text-danger-light mt-1">{fieldErrors.radius}</p>
            )}
          </div>
        )}

        {form.cuttingType === "triangle" && (
          <>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">
                Base (mm)
              </label>
              <input
                name="base"
                type="number"
                value={form.base}
                onChange={handleChange}
                placeholder="80"
                required
                min="5"
                step="any"
                className={getInputClass("base")}
              />
              {fieldErrors.base && (
                <p className="text-xs text-danger-light mt-1">{fieldErrors.base}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">
                Height (mm)
              </label>
              <input
                name="height"
                type="number"
                value={form.height}
                onChange={handleChange}
                placeholder="40"
                required
                min="5"
                step="any"
                className={getInputClass("height")}
              />
              {fieldErrors.height && (
                <p className="text-xs text-danger-light mt-1">{fieldErrors.height}</p>
              )}
            </div>
          </>
        )}

        {/* Position X */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">
            Pos X (mm)
          </label>
          <input
            name="positionX"
            type="number"
            value={form.positionX}
            onChange={handleChange}
            placeholder="0"
            min="0"
            step="10"
            className={getInputClass("positionX")}
          />
          {fieldErrors.positionX && (
            <p className="text-xs text-danger-light mt-1">{fieldErrors.positionX}</p>
          )}
        </div>

        {/* Position Y */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">
            Pos Y (mm)
          </label>
          <input
            name="positionY"
            type="number"
            value={form.positionY}
            onChange={handleChange}
            placeholder="0"
            min="0"
            step="10"
            className={getInputClass("positionY")}
          />
          {fieldErrors.positionY && (
            <p className="text-xs text-danger-light mt-1">{fieldErrors.positionY}</p>
          )}
        </div>
      </div>

      {/* Footer: preview + submit */}
      <div className="flex items-center justify-between pt-1">
        {previewArea > 0 ? (
          <p className="text-sm text-text-secondary">
            Cut Area:{" "}
            <span className="font-semibold text-primary">
              {formatArea(previewArea)}
            </span>
          </p>
        ) : (
          <div />
        )}
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-3 px-6 py-3 h-11 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1 focus:ring-offset-bg-base"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
          ) : (
            <>
              <Plus className="w-5 h-5 shrink-0" />
              Add Cutting
            </>
          )}
        </button>
      </div>
    </form>
  );
}
