// ============================================================
// PHH Inventory — Flowchart Node Card
// Compact card for visualizing sheets in a flowchart layout.
// ============================================================

import { useNavigate } from "react-router-dom";
import { Package, AlertTriangle, Archive, GitBranch, ExternalLink } from "lucide-react";
import { formatPercent } from "../../lib/calculations";

const STATUS_CONFIG = {
  active: { label: "Active", color: "text-success", bg: "bg-success/10", borderColor: "border-success/40", glowColor: "shadow-success/10", icon: Package },
  depleted: { label: "Depleted", color: "text-warning", bg: "bg-warning/10", borderColor: "border-warning/40", glowColor: "shadow-warning/10", icon: AlertTriangle },
  archived: { label: "Archived", color: "text-scrap", bg: "bg-scrap/10", borderColor: "border-scrap/40", glowColor: "shadow-scrap/10", icon: Archive },
};

export default function FlowchartCard({ node, isRoot = false, isSelected = false, onSelect }) {
  const navigate = useNavigate();
  const statusCfg = STATUS_CONFIG[node.status] || STATUS_CONFIG.active;
  const StatusIcon = statusCfg.icon;

  const usedPct = node.totalArea > 0 ? (node.usedArea / node.totalArea) * 100 : 0;

  const handleClick = (e) => {
    e.stopPropagation();
    if (onSelect) onSelect(node.id);
  };

  const handleNavigate = (e) => {
    e.stopPropagation();
    navigate(`/sheets/${node.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className={`
        group relative w-[220px] bg-bg-surface rounded-xl border-2 p-3 cursor-pointer
        transition-all duration-300 ease-out theme-transition select-none
        hover:scale-[1.03] hover:shadow-xl hover:-translate-y-0.5
        ${isSelected
          ? "border-primary shadow-lg shadow-primary/20 ring-2 ring-primary/20"
          : isRoot
            ? `${statusCfg.borderColor} hover:border-primary/60 shadow-md ${statusCfg.glowColor}`
            : "border-border hover:border-primary/40 shadow-sm hover:shadow-lg"
        }
      `}
    >
      {/* Root badge */}
      {isRoot && (
        <div className="absolute -top-2.5 left-3 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest bg-primary text-white shadow-sm">
          Main Sheet
        </div>
      )}

      {/* Son badge */}
      {!isRoot && node.parentId && (
        <div className="absolute -top-2 left-3 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-semibold uppercase tracking-wider bg-bg-elevated text-text-muted border border-border">
          <GitBranch className="w-2.5 h-2.5" />
          Son
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mt-1 mb-2">
        <div className="flex-1 min-w-0 pr-1">
          <h4 className="text-sm font-bold text-text-primary leading-tight truncate group-hover:text-primary transition-colors">
            {node.sheetNumber}
          </h4>
          <p className="text-[10px] text-text-muted mt-0.5 truncate">
            {node.grade} • {node.supplier}
          </p>
        </div>
        <span className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase ${statusCfg.bg} ${statusCfg.color}`}>
          <StatusIcon className="w-2.5 h-2.5" />
          {statusCfg.label}
        </span>
      </div>

      {/* Dimensions */}
      <div className="flex items-center gap-1.5 text-[10px] text-text-secondary mb-2">
        <span className="font-medium bg-bg-elevated/60 px-1.5 py-0.5 rounded">
          {node.length}×{node.width}×{node.thickness}
        </span>
        <span className="font-mono text-[8px] text-text-muted bg-bg-elevated/40 px-1 py-0.5 rounded border border-border/50">
          ID: {node.id.split('-')[0]}
        </span>
      </div>

      {/* Usage Bar */}
      <div className="mb-2">
        <div className="flex justify-between text-[10px] mb-0.5">
          <span className="text-text-muted font-medium">Usage</span>
          <span className="text-text-secondary font-bold tabular-nums">{formatPercent(usedPct)}</span>
        </div>
        <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
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

      {/* View Detail Link */}
      <button
        onClick={handleNavigate}
        className="flex items-center gap-1 text-[10px] font-semibold text-primary hover:text-primary-light transition-colors w-full justify-center py-1 rounded-md hover:bg-primary/5"
      >
        View Details <ExternalLink className="w-3 h-3" />
      </button>

      {/* Hover glow effect */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
    </div>
  );
}
