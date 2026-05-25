import { useState } from "react";
import { X, Scissors, ArrowRight, CheckCircle2 } from "lucide-react";
import { sheetApi } from "../../lib/api";

export default function SelectCuttingModal({ sheetId, sheetNumber, cuttings, onClose, onCreated }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleMakeSon = async (cuttingId, jobNumber) => {
    const defaultName = `${jobNumber.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()}`;
    const customName = window.prompt("Enter a custom name for this Son Sheet (a 4-character unique ID will be appended):", defaultName);
    
    if (customName === null) return;

    setLoading(true);
    setError("");
    try {
      const res = await sheetApi.createSonFromCutting(sheetId, cuttingId, customName);
      onCreated();
      alert(`Son Sheet successfully created!\nNew ID: ${res.data.data.sheetNumber}`);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create Son Sheet");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-surface/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-bg-surface border border-border w-full max-w-md rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Scissors className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary leading-tight">
                Select Cutting Job
              </h2>
              <p className="text-sm text-text-muted mt-0.5">
                Choose a cut to save as a new Son Sheet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-primary hover:bg-bg-elevated rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-5 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-danger/10 text-danger-light text-sm font-medium border border-danger/20">
              {error}
            </div>
          )}

          {cuttings.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              <Scissors className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium text-text-secondary">No cuts available</p>
              <p className="text-xs mt-1">Create a cut first to save it as a Son Sheet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cuttings.map((cut) => {
                let dimsText = "";
                if (cut.cuttingType === "rectangle") {
                  dimsText = `${cut.dimensions.length} × ${cut.dimensions.width} mm`;
                } else if (cut.cuttingType === "circle") {
                  dimsText = `Radius: ${cut.dimensions.radius} mm`;
                } else if (cut.cuttingType === "triangle") {
                  dimsText = `Base: ${cut.dimensions.base}, Height: ${cut.dimensions.height}`;
                }

                return (
                  <div
                    key={cut.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-border bg-bg-elevated hover:border-primary/40 hover:shadow-sm transition-all group"
                  >
                    <div>
                      <h4 className="font-semibold text-text-primary text-sm">
                        {cut.jobNumber || "Draft"}
                      </h4>
                      <p className="text-xs text-text-muted mt-0.5 capitalize">
                        {cut.cuttingType} • {dimsText}
                      </p>
                    </div>
                    <button
                      onClick={() => handleMakeSon(cut.id, cut.jobNumber)}
                      disabled={loading}
                      className="px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                    >
                      {loading ? (
                        <div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      ) : (
                        <>
                          Select <ArrowRight className="w-3 h-3" />
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
