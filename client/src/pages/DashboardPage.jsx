// ============================================================
// PHH Inventory — Dashboard Page (Sheet Listing + Filters)
// Debounced search & dimension filters
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { sheetApi } from "../lib/api";
import { formatArea, formatPercent } from "../lib/calculations";
import {
  Plus,
  Search,
  Layers,
  ArrowRight,
  Package,
  AlertTriangle,
  Archive,
  RefreshCw,
  SlidersHorizontal,
  X,
} from "lucide-react";
import NewSheetModal from "../components/forms/NewSheetModal";
import SheetCard from "../components/sheet/SheetCard";
import useDebounce from "../hooks/useDebounce";

const STATUS_CONFIG = {
  active: { label: "Active", color: "text-success", bg: "bg-success/10", icon: Package },
  depleted: { label: "Depleted", color: "text-warning", bg: "bg-warning/10", icon: AlertTriangle },
  archived: { label: "Archived", color: "text-scrap", bg: "bg-scrap/10", icon: Archive },
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [sheets, setSheets] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [thickness, setThickness] = useState("");
  const [minLength, setMinLength] = useState("");
  const [minWidth, setMinWidth] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [matchingSheetIds, setMatchingSheetIds] = useState([]);

  // Debounce all filter values (500ms)
  const debouncedSearch = useDebounce(search, 500);
  const debouncedThickness = useDebounce(thickness, 500);
  const debouncedMinLength = useDebounce(minLength, 500);
  const debouncedMinWidth = useDebounce(minWidth, 500);

  const fetchSheets = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page: pagination.page, limit: 24, isRootOnly: true };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter) {
        params.status = statusFilter;
      } else {
        params.excludeStatus = 'archived';
      }
      if (debouncedThickness) params.thickness = Number(debouncedThickness);
      if (debouncedMinLength) params.minLength = Number(debouncedMinLength);
      if (debouncedMinWidth) params.minWidth = Number(debouncedMinWidth);
      const { data } = await sheetApi.list(params);
      setSheets(data.data || []);
      setMatchingSheetIds(data.matchingSheetIds || []);
      setPagination((prev) => ({
        ...prev,
        totalPages: data.pagination?.totalPages || 1,
      }));
    } catch (err) {
      console.error("Failed to fetch sheets:", err);
      setError("Failed to load sheet data. Make sure the backend server is running.");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, debouncedSearch, statusFilter, debouncedThickness, debouncedMinLength, debouncedMinWidth]);

  useEffect(() => {
    fetchSheets();
  }, [fetchSheets]);

  const clearFilters = () => {
    setThickness("");
    setMinLength("");
    setMinWidth("");
    setStatusFilter("");
    setSearch("");
    setMatchingSheetIds([]);
  };

  const hasActiveFilters = thickness || minLength || minWidth || statusFilter;

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
            Sheet Inventory
          </h1>
          <p className="text-text-secondary text-xs mt-0.5">
            Manage master sheets and track material usage
          </p>
        </div>
        <button
          id="btn-new-sheet"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 h-9 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-all duration-150 shadow-sm hover:shadow-md cursor-pointer text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <Plus className="w-4 h-4 shrink-0" />
          New Sheet
        </button>
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

          {/* Status */}
          <select
            id="filter-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 h-9 bg-bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer text-sm theme-transition"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="depleted">Depleted</option>
          </select>

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-44 skeleton" />
            ))}
          </div>
        ) : sheets.length === 0 && !error ? (
          <div className="flex flex-col items-center justify-center py-16 text-text-muted">
            <Layers className="w-14 h-14 mb-3 opacity-20" />
            <p className="text-base font-semibold text-text-secondary">
              No sheets found
            </p>
            <p className="text-xs mt-1">
              {hasActiveFilters
                ? "Try adjusting your filters"
                : "Create your first master sheet to get started"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
            {sheets.map((sheet, idx) => (
              <SheetCard 
                key={sheet.id} 
                sheet={sheet} 
                matchingSheetIds={matchingSheetIds}
                searchActive={!!debouncedSearch}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── New Sheet Modal ── */}
      {showModal && (
        <NewSheetModal
          onClose={() => setShowModal(false)}
          onCreated={() => {
            setShowModal(false);
            fetchSheets();
          }}
        />
      )}
    </div>
  );
}
