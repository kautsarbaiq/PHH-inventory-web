// ============================================================
// PHH Inventory — Dynamic Cutting Order Form
// Refactored: client-side validation, field-level errors,
// improved spacing, loading states, success feedback
// ============================================================

import { useState, useMemo, useEffect } from "react";
import { cuttingApi } from "../../lib/api";
import { calculateCutArea, formatArea } from "../../lib/calculations";
import { CUTTING_TYPES as CT, MIN_CUT_DIMENSION } from "@phh/shared/constants";
import { AlertCircle, Plus, CheckCircle2, Clock } from "lucide-react";

const MIN_RADIUS = MIN_CUT_DIMENSION / 2;

const CUTTING_TYPES = [
  { value: CT.RECTANGLE, label: "▭ Rectangle" },
  { value: CT.CIRCLE, label: "⭕ Circle" },
  { value: CT.TRIANGLE, label: "△ Triangle" },
];

export default function CuttingOrderForm({ sheetId, sheet, onCreated, onPreviewChange, onViewHistory, cuttingsCount }) {
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

  // For circles, position is the CENTER — so a default of (0,0) always fails the
  // server's within-bounds check. When a radius is entered and the position is
  // still the untouched default, nudge it to (r, r) so the circle starts valid.
  useEffect(() => {
    if (form.cuttingType !== "circle") return;
    const r = parseFloat(form.radius);
    if (!isNaN(r) && r > 0 && (form.positionX === "0" || form.positionX === "")) {
      setForm((prev) => ({ ...prev, positionX: String(r), positionY: String(r) }));
    }
  }, [form.cuttingType, form.radius]);
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
        if (isNaN(l) || l < MIN_CUT_DIMENSION) errors.length = `Min ${MIN_CUT_DIMENSION} mm`;
        if (isNaN(w) || w < MIN_CUT_DIMENSION) errors.width = `Min ${MIN_CUT_DIMENSION} mm`;
        if (l > sheet.length) errors.length = `Max ${sheet.length} mm`;
        if (w > sheet.width) errors.width = `Max ${sheet.width} mm`;
        // Top-left positioning: shape must fit within the sheet.
        if (!errors.length && !isNaN(posX) && posX + l > sheet.length)
          errors.positionX = `Max ${sheet.length - l} mm`;
        if (!errors.width && !isNaN(posY) && posY + w > sheet.width)
          errors.positionY = `Max ${sheet.width - w} mm`;
        break;
      }
      case "circle": {
        const r = parseFloat(form.radius);
        if (isNaN(r) || r < MIN_RADIUS) errors.radius = `Min ${MIN_RADIUS} mm`;
        if (r * 2 > Math.min(sheet.length, sheet.width))
          errors.radius = `Max ${Math.min(sheet.length, sheet.width) / 2} mm`;
        // Circle position is the CENTER: it must be at least `r` from each edge.
        if (!errors.radius && !isNaN(r)) {
          if (!isNaN(posX) && (posX < r || posX + r > sheet.length))
            errors.positionX = `${r}–${sheet.length - r} mm`;
          if (!isNaN(posY) && (posY < r || posY + r > sheet.width))
            errors.positionY = `${r}–${sheet.width - r} mm`;
        }
        break;
      }
      case "triangle": {
        const b = parseFloat(form.base);
        const h = parseFloat(form.height);
        if (isNaN(b) || b < MIN_CUT_DIMENSION) errors.base = `Min ${MIN_CUT_DIMENSION} mm`;
        if (isNaN(h) || h < MIN_CUT_DIMENSION) errors.height = `Min ${MIN_CUT_DIMENSION} mm`;
        if (b > sheet.length) errors.base = `Max ${sheet.length} mm`;
        if (h > sheet.width) errors.height = `Max ${sheet.width} mm`;
        if (!errors.base && !isNaN(posX) && posX + b > sheet.length)
          errors.positionX = `Max ${sheet.length - b} mm`;
        if (!errors.height && !isNaN(posY) && posY + h > sheet.width)
          errors.positionY = `Max ${sheet.width - h} mm`;
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
          <span>Cutting successfully added!</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-8 gap-4 items-end">
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

        {/* Buttons: Riwayat + Add Cutting */}
        <div className="lg:col-span-2 md:col-span-3 sm:col-span-2 flex flex-col gap-1 w-full self-end">
          {previewArea > 0 && (
            <p className="text-[10px] text-text-secondary font-medium tracking-wide text-right mb-0.5 pr-1">
              Cut Area: <span className="font-semibold text-primary">{formatArea(previewArea)}</span>
            </p>
          )}
          <div className="flex gap-2 w-full">
            {onViewHistory && (
              <button
                type="button"
                onClick={onViewHistory}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 h-11 bg-bg-elevated hover:bg-bg-hover text-text-secondary hover:text-text-primary font-semibold rounded-lg border border-border transition-colors cursor-pointer text-xs focus:outline-none focus:ring-2 focus:ring-border/50"
              >
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>Riwayat ({cuttingsCount || 0})</span>
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 h-11 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-xs shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1 focus:ring-offset-bg-base"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
              ) : (
                <>
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>Add Cutting</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
