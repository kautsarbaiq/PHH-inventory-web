// ============================================================
// PHH Inventory — Dynamic Cutting Order Form
// ============================================================

import { useState } from "react";
import { cuttingApi } from "../../lib/api";
import { calculateCutArea, formatArea } from "../../lib/calculations";
import { AlertCircle, Plus } from "lucide-react";

const CUTTING_TYPES = [
  { value: "rectangle", label: "▭ Rectangle" },
  { value: "circle", label: "⭕ Circle" },
  { value: "triangle", label: "△ Triangle" },
];

export default function CuttingOrderForm({ sheetId, sheet, onCreated }) {
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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
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
  const previewArea = (() => {
    try {
      const dims = getDimensions();
      return calculateCutArea(form.cuttingType, dims);
    } catch {
      return 0;
    }
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const dimensions = getDimensions();
      await cuttingApi.create(sheetId, {
        jobNumber: form.jobNumber,
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
      onCreated();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create cutting");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2 bg-bg-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm";

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-danger/10 border border-danger/20 text-danger-light text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 items-end">
        {/* Job # */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Job #
          </label>
          <input
            name="jobNumber"
            value={form.jobNumber}
            onChange={handleChange}
            placeholder="J-001"
            required
            className={inputClass}
          />
        </div>

        {/* Cutting Type */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Type
          </label>
          <select
            name="cuttingType"
            value={form.cuttingType}
            onChange={handleChange}
            className={inputClass + " cursor-pointer"}
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
              <label className="block text-xs font-medium text-text-secondary mb-1">
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
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
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
                className={inputClass}
              />
            </div>
          </>
        )}

        {form.cuttingType === "circle" && (
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
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
              className={inputClass}
            />
          </div>
        )}

        {form.cuttingType === "triangle" && (
          <>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
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
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
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
                className={inputClass}
              />
            </div>
          </>
        )}

        {/* Position X */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
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
            className={inputClass}
          />
        </div>

        {/* Position Y */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
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
            className={inputClass}
          />
        </div>
      </div>

      {/* Footer: preview + submit */}
      <div className="flex items-center justify-between mt-4">
        {previewArea > 0 ? (
          <p className="text-sm text-text-secondary">
            Cut Area:{" "}
            <span className="font-medium text-primary">
              {formatArea(previewArea)}
            </span>
          </p>
        ) : (
          <div />
        )}
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-all disabled:opacity-50 cursor-pointer text-sm"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Add Cutting
            </>
          )}
        </button>
      </div>
    </form>
  );
}
