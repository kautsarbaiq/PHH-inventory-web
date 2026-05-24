import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Package, AlertTriangle, Archive, ArrowRight, ChevronDown, ChevronRight, GitBranch } from "lucide-react";
import { formatPercent, calculateWeight, formatWeight } from "../../lib/calculations";
import { sheetApi } from "../../lib/api";

const STATUS_CONFIG = {
  active: { label: "Active", color: "text-success", bg: "bg-success/10", icon: Package },
  depleted: { label: "Depleted", color: "text-warning", bg: "bg-warning/10", icon: AlertTriangle },
  archived: { label: "Archived", color: "text-scrap", bg: "bg-scrap/10", icon: Archive },
};

export default function SheetCard({ sheet, depth = 0 }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(false);

  const usedPct = sheet.totalArea > 0 ? (sheet.usedArea / sheet.totalArea) * 100 : 0;
  const statusCfg = STATUS_CONFIG[sheet.status] || STATUS_CONFIG.active;
  const StatusIcon = statusCfg.icon;
  const weight = calculateWeight(sheet);

  const handleToggleExpand = async (e) => {
    e.stopPropagation();
    if (!expanded) {
      setExpanded(true);
      if (children.length === 0) {
        setLoading(true);
        try {
          const res = await sheetApi.list({ parentId: sheet.id });
          setChildren(res.data.data || []);
        } catch (err) {
          console.error("Failed to fetch children", err);
        } finally {
          setLoading(false);
        }
      }
    } else {
      setExpanded(false);
    }
  };

  const handleNavigate = (e) => {
    e.stopPropagation();
    navigate(`/sheets/${sheet.id}`);
  };

  // The deeper we go, the narrower it might get, so adjust styling
  const isNested = depth > 0;

  return (
    <div className={`flex flex-col bg-bg-surface ${isNested ? 'border-l-2 border-l-primary/30 pl-3 mt-3' : 'rounded-xl border border-border hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 p-4'} transition-all duration-200 group animate-fade-in theme-transition`}>
      {/* Sheet header */}
      <div 
        className="flex items-start justify-between mb-3 cursor-pointer"
        onClick={handleToggleExpand}
      >
        <div className="flex items-start gap-2">
          <button className="mt-0.5 text-text-muted hover:text-primary transition-colors">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          <div>
            <h3 className={`font-semibold text-text-primary leading-tight flex items-center gap-1.5 ${isNested ? 'text-sm' : 'text-base'}`}>
              {isNested && <GitBranch className="w-3 h-3 text-text-muted" />}
              {sheet.sheetNumber}
            </h3>
            <p className="text-[11px] text-text-secondary mt-0.5">
              {sheet.grade} • {sheet.supplier}
            </p>
          </div>
        </div>
        {!isNested && (
          <span className={`shrink-0 inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-semibold uppercase tracking-wide ${statusCfg.bg} ${statusCfg.color}`}>
            <StatusIcon className="w-2.5 h-2.5 shrink-0" />
            {statusCfg.label}
          </span>
        )}
      </div>

      {/* Details Row */}
      <div className="flex items-center justify-between text-xs mb-3 text-text-muted">
        <span className="font-medium">
          {sheet.length} × {sheet.width} × {sheet.thickness}
        </span>
        <span className="font-semibold text-text-primary bg-bg-elevated px-1.5 py-0.5 rounded">
          {formatWeight(weight)}
        </span>
      </div>

      {/* Usage bar */}
      <div className="mb-3">
        <div className="flex justify-between text-[11px] mb-1">
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

      {/* Actions */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
        <span className="text-[10px] text-text-muted">{sheet.cuttingCount} Cuttings</span>
        <button 
          onClick={handleNavigate}
          className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary-light transition-colors"
        >
          View Details <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Nested Children Accordion */}
      {expanded && (
        <div className="flex flex-col mt-2 animate-fade-in">
          {loading ? (
            <div className="text-xs text-text-muted py-2 text-center animate-pulse">Loading Son Sheets...</div>
          ) : children.length === 0 ? (
            <div className="text-xs text-text-muted py-2 text-center">No Son Sheets</div>
          ) : (
            children.map(child => (
              <SheetCard key={child.id} sheet={child} depth={depth + 1} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
