import { useState, useEffect } from "react";
import { sheetApi } from "../../lib/api";
import { X, Settings2, AlertCircle } from "lucide-react";

export default function EditSheetModal({ sheet, onClose, onUpdated }) {
  const [form, setForm] = useState({
    length: "",
    width: "",
    thickness: "",
    density: "",
    kerfAllowance: "",
  });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sheet) {
      setForm({
        length: sheet.length || "",
        width: sheet.width || "",
        thickness: sheet.thickness || "",
        density: sheet.density > 0 ? (sheet.density * 1000000).toFixed(4).replace(/\.?0+$/, '') : "7.85",
        kerfAllowance: sheet.kerfAllowance || "2",
      });
    }
  }, [sheet]);

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
    const l = parseFloat(form.length);
    const w = parseFloat(form.width);
    const t = parseFloat(form.thickness);
    const d = parseFloat(form.density);
    const k = parseFloat(form.kerfAllowance);
    
    if (isNaN(l) || l < 5) errors.length = "Min 5 mm";
    if (isNaN(w) || w < 5) errors.width = "Min 5 mm";
    if (isNaN(t) || t < 0.1) errors.thickness = "Min 0.1 mm";
    if (isNaN(d) || d <= 0) errors.density = "Density must be positive";
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
      await sheetApi.update(sheet.id, {
        length: parseFloat(form.length),
        width: parseFloat(form.width),
        thickness: parseFloat(form.thickness),
        density: parseFloat(form.density) / 1000000, // stored as kg/mm³
        kerfAllowance: parseFloat(form.kerfAllowance),
      });
      onUpdated();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.details || "Failed to update sheet";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  const inputBase = "w-full h-10 px-3 bg-bg-elevated border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 transition-all text-sm";
  const inputOk = `${inputBase} border-border focus:ring-primary/50 focus:border-primary`;
  const inputErr = `${inputBase} border-danger/50 focus:ring-danger/50 focus:border-danger`;

  const getInputClass = (name) => (fieldErrors[name] ? inputErr : inputOk);

  // Calculated weight preview
  const weightPreview = (() => {
    const l = parseFloat(form.length);
    const w = parseFloat(form.width);
    const t = parseFloat(form.thickness);
    const d = parseFloat(form.density);
    if (l > 0 && w > 0 && t > 0 && d > 0) {
       const volumeMm3 = l * w * t;
       return ((d * volumeMm3) / 1000000).toFixed(2);
    }
    return null;
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-bg-surface rounded-2xl border border-border w-full max-w-md mx-4 shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Settings2 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary leading-tight">Edit Sheet Info</h2>
              <p className="text-xs text-text-muted mt-0.5">Update physical dimensions</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-5 py-5 space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger-light text-xs animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
            
            <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg text-xs text-warning-light mb-2">
              <strong>Note:</strong> Changing dimensions of a sheet with existing cuts may cause the cuts to fall outside the visual canvas.
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase">Length (mm)</label>
                <input name="length" type="number" value={form.length} onChange={handleChange} required min="5" step="any" className={getInputClass("length")} />
                {fieldErrors.length && <p className="text-[10px] text-danger-light mt-1">{fieldErrors.length}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase">Width (mm)</label>
                <input name="width" type="number" value={form.width} onChange={handleChange} required min="5" step="any" className={getInputClass("width")} />
                {fieldErrors.width && <p className="text-[10px] text-danger-light mt-1">{fieldErrors.width}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase">Thickness (mm)</label>
                <input name="thickness" type="number" value={form.thickness} onChange={handleChange} required min="0.1" step="any" className={getInputClass("thickness")} />
                {fieldErrors.thickness && <p className="text-[10px] text-danger-light mt-1">{fieldErrors.thickness}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase">Kerf (mm)</label>
                <input name="kerfAllowance" type="number" value={form.kerfAllowance} onChange={handleChange} required min="0" step="any" className={getInputClass("kerfAllowance")} />
                {fieldErrors.kerfAllowance && <p className="text-[10px] text-danger-light mt-1">{fieldErrors.kerfAllowance}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase">Density (g/cm³)</label>
              <input name="density" type="number" value={form.density} onChange={handleChange} required step="any" min="0.001" className={getInputClass("density")} />
              {fieldErrors.density && <p className="text-[10px] text-danger-light mt-1">{fieldErrors.density}</p>}
            </div>

            {weightPreview && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-xs">
                <span className="text-text-secondary">Calculated Weight: </span>
                <span className="font-bold text-primary tabular-nums">{weightPreview} kg</span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 px-5 py-4 bg-bg-elevated border-t border-border">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary rounded-lg transition-all cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-5 py-2 bg-primary hover:bg-primary-light text-white text-xs font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer">
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
