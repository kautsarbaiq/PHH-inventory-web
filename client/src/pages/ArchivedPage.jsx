import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { sheetApi } from "../lib/api";
import { formatArea, formatPercent } from "../lib/calculations";
import {
  Search,
  Archive,
  RefreshCw,
  SlidersHorizontal,
  X,
  Trash2,
  AlertTriangle
} from "lucide-react";
import useDebounce from "../hooks/useDebounce";

export default function ArchivedPage() {
  const navigate = useNavigate();
  const [sheets, setSheets] = useState([]);
  const [search, setSearch] = useState("");
  const [thickness, setThickness] = useState("");
  const [minLength, setMinLength] = useState("");
  const [minWidth, setMinWidth] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [deletingId, setDeletingId] = useState(null);

  // Debounce all filter values (500ms)
  const debouncedSearch = useDebounce(search, 500);
  const debouncedThickness = useDebounce(thickness, 500);
  const debouncedMinLength = useDebounce(minLength, 500);
  const debouncedMinWidth = useDebounce(minWidth, 500);

  const fetchSheets = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page: pagination.page, limit: 12, status: 'archived' };
      if (debouncedSearch) params.search = debouncedSearch;
      if (debouncedThickness) params.thickness = Number(debouncedThickness);
      if (debouncedMinLength) params.minLength = Number(debouncedMinLength);
      if (debouncedMinWidth) params.minWidth = Number(debouncedMinWidth);
      const { data } = await sheetApi.list(params);
      setSheets(data.data || []);
      setPagination((prev) => ({
        ...prev,
        totalPages: data.pagination?.totalPages || 1,
      }));
    } catch (err) {
      console.error("Failed to fetch archived sheets:", err);
      setError("Failed to load sheet data. Make sure the backend server is running.");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, debouncedSearch, debouncedThickness, debouncedMinLength, debouncedMinWidth]);

  useEffect(() => {
    fetchSheets();
  }, [fetchSheets]);

  const handleDeletePermanent = async (e, id, sheetNumber) => {
    e.stopPropagation(); // Prevent card click from navigating
    if (!window.confirm(`Are you sure you want to PERMANENTLY delete sheet ${sheetNumber}? This action cannot be undone and will delete all associated cuttings.`)) {
      return;
    }
    setDeletingId(id);
    try {
      await sheetApi.deletePermanent(id);
      fetchSheets();
    } catch (err) {
      console.error("Failed to delete sheet:", err);
      alert("Failed to delete sheet permanently.");
    } finally {
      setDeletingId(null);
    }
  };

  const clearFilters = () => {
    setThickness("");
    setMinLength("");
    setMinWidth("");
    setSearch("");
  };

  const hasActiveFilters = thickness || minLength || minWidth;

  const getUsedPercent = (sheet) => {
    if (!sheet.totalArea || sheet.totalArea === 0) return 0;
    return ((sheet.usedArea || 0) / sheet.totalArea) * 100;
  };

  return (
    <div className="h-full flex flex-col p-4 sm:p-6 overflow-y-auto">
      {/* ── Header ── */}
      <div className="flex items-center justify-between shrink-0 mb-5">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">
            Archived Sheets
          </h1>
          <p className="text-text-secondary text-xs mt-0.5">
            View and permanently delete archived master sheets
          </p>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="shrink-0 mb-5 space-y-3">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted shrink-0" />
            <input
              id="search-sheets"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by sheet number..."
              className="w-full h-9 pl-9 pr-3 bg-bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm theme-transition"
            />
          </div>

          {/* Toggle dimension filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 h-9 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
              showFilters || hasActiveFilters
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border bg-bg-surface text-text-secondary hover:text-text-primary hover:border-text-muted"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </button>

          {/* Clear all */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-2.5 h-9 text-xs font-medium text-danger hover:text-danger-light transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>

        {/* Dimension filters (collapsible) */}
        {showFilters && (
          <div className="flex items-end gap-3 p-3 bg-bg-surface rounded-lg border border-border animate-fade-in">
            <div>
              <label className="block text-[10px] font-semibold text-text-secondary mb-1 uppercase tracking-wider">
                Thickness (mm)
              </label>
              <input
                type="number"
                value={thickness}
                onChange={(e) => setThickness(e.target.value)}
                placeholder="Exact"
                step="any"
                className="w-24 h-8 px-2.5 bg-bg-elevated border border-border rounded-md text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-text-muted"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-text-secondary mb-1 uppercase tracking-wider">
                Min Length (mm)
              </label>
              <input
                type="number"
                value={minLength}
                onChange={(e) => setMinLength(e.target.value)}
                placeholder="≥"
                step="any"
                className="w-24 h-8 px-2.5 bg-bg-elevated border border-border rounded-md text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-text-muted"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-text-secondary mb-1 uppercase tracking-wider">
                Min Width (mm)
              </label>
              <input
                type="number"
                value={minWidth}
                onChange={(e) => setMinWidth(e.target.value)}
                placeholder="≥"
                step="any"
                className="w-24 h-8 px-2.5 bg-bg-elevated border border-border rounded-md text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-text-muted"
              />
            </div>
            <p className="text-[10px] text-text-muted pb-1">
              Auto-searches after 500ms
            </p>
          </div>
        )}
      </div>

      {/* ── Error State ── */}
      {error && (
        <div className="shrink-0 flex items-center justify-between p-3 rounded-xl bg-danger/10 border border-danger/20 animate-fade-in mb-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-danger shrink-0" />
            <p className="text-sm text-danger-light font-medium">{error}</p>
          </div>
          <button
            onClick={fetchSheets}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-danger-light hover:text-white bg-danger/10 hover:bg-danger/30 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )}

      {/* ── Sheet Grid ── */}
      <div className="flex-1">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
               <div key={i} className="h-44 skeleton" />
            ))}
          </div>
        ) : sheets.length === 0 && !error ? (
          <div className="flex flex-col items-center justify-center py-16 text-text-muted">
            <Archive className="w-14 h-14 mb-3 opacity-20" />
            <p className="text-base font-semibold text-text-secondary">
              No archived sheets
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sheets.map((sheet, idx) => {
              const usedPct = getUsedPercent(sheet);
              const isDeleting = deletingId === sheet.id;

              return (
                <div
                  key={sheet.id}
                  onClick={() => navigate(`/sheets/${sheet.id}`)}
                  className={`bg-bg-surface rounded-xl border border-border p-4 cursor-pointer hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 group animate-fade-in theme-transition ${isDeleting ? "opacity-50 pointer-events-none" : ""}`}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  {/* Sheet header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-text-primary text-base leading-tight">
                        {sheet.sheetNumber}
                      </h3>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {sheet.grade} • {sheet.supplier}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide bg-scrap/10 text-scrap">
                      <Archive className="w-3 h-3 shrink-0" />
                      Archived
                    </span>
                  </div>

                  {/* Usage bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-text-muted font-medium">Usage</span>
                      <span className="text-text-secondary font-semibold">
                        {formatPercent(usedPct)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(usedPct, 100)}%`,
                          background:
                            usedPct > 80
                              ? "var(--color-danger)"
                              : usedPct > 50
                                ? "var(--color-warning)"
                                : "var(--color-primary)",
                        }}
                      />
                    </div>
                  </div>

                  {/* Footer (Dimensions + Delete) */}
                  <div className="flex items-center justify-between mt-4 border-t border-border pt-3">
                    <span className="text-xs text-text-muted font-medium">
                      {sheet.length} × {sheet.width} × {sheet.thickness} mm
                    </span>
                    
                    <button
                      onClick={(e) => handleDeletePermanent(e, sheet.id, sheet.sheetNumber)}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold text-danger hover:bg-danger/10 transition-colors"
                      title="Permanently Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
