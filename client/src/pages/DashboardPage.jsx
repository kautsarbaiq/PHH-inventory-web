// ============================================================
// PHH Inventory — Dashboard Page (Sheet Listing)
// ============================================================

import { useState, useEffect } from "react";
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
} from "lucide-react";
import NewSheetModal from "../components/forms/NewSheetModal";

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
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });

  const fetchSheets = async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: 12 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const { data } = await sheetApi.list(params);
      setSheets(data.data || []);
      setPagination((prev) => ({
        ...prev,
        totalPages: data.pagination?.totalPages || 1,
      }));
    } catch (err) {
      console.error("Failed to fetch sheets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSheets();
  }, [pagination.page, search, statusFilter]);

  const getUsedPercent = (sheet) => {
    if (!sheet.totalArea || sheet.totalArea === 0) return 0;
    return ((sheet.usedArea || 0) / sheet.totalArea) * 100;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Sheet Inventory
          </h1>
          <p className="text-text-secondary mt-1">
            Manage master sheets and track material usage
          </p>
        </div>
        <button
          id="btn-new-sheet"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          New Sheet
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            id="search-sheets"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by sheet number..."
            className="w-full pl-10 pr-4 py-2 bg-bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>
        <select
          id="filter-status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="depleted">Depleted</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Sheet Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 bg-bg-surface rounded-xl border border-border animate-pulse"
            />
          ))}
        </div>
      ) : sheets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
          <Layers className="w-16 h-16 mb-4 opacity-30" />
          <p className="text-lg font-medium">No sheets found</p>
          <p className="text-sm mt-1">Create your first sheet to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sheets.map((sheet, idx) => {
            const usedPct = getUsedPercent(sheet);
            const statusCfg = STATUS_CONFIG[sheet.status] || STATUS_CONFIG.active;
            const StatusIcon = statusCfg.icon;

            return (
              <div
                key={sheet.id}
                onClick={() => navigate(`/sheets/${sheet.id}`)}
                className="bg-bg-surface rounded-xl border border-border p-5 cursor-pointer hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 group animate-fade-in"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {/* Sheet header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-text-primary text-lg">
                      {sheet.sheetNumber}
                    </h3>
                    <p className="text-sm text-text-secondary">
                      {sheet.grade} • {sheet.supplier}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${statusCfg.bg} ${statusCfg.color}`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {statusCfg.label}
                  </span>
                </div>

                {/* Usage bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-text-secondary mb-1">
                    <span>Usage</span>
                    <span>{formatPercent(usedPct)}</span>
                  </div>
                  <div className="h-2 bg-bg-elevated rounded-full overflow-hidden">
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

                {/* Dimensions */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-muted">
                    {sheet.length} × {sheet.width} × {sheet.thickness} mm
                  </span>
                  <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Sheet Modal */}
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
