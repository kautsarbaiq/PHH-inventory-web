import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Package, AlertTriangle, Archive, ArrowRight, ChevronDown, ChevronRight, GitBranch } from "lucide-react";
import { formatPercent, calculateWeight, formatWeight } from "../../lib/calculations";
import { sheetApi } from "../../lib/api";

const STATUS_CONFIG = {
  active: { label: "Active", color: "text-success", bg: "bg-success/10", icon: Package },
  depleted: { label: "Depleted", color: "text-warning", bg: "bg-warning/10", icon: AlertTriangle },
  archived: { label: "Archived", color: "text-scrap", bg: "bg-scrap/10", icon: Archive },
};

// Recursive helper to check if any descendant sheet ID matches search
const hasMatchingDescendant = (node, matchIds) => {
  if (!node || !matchIds || matchIds.length === 0) return false;
  if (!node.children || node.children.length === 0) return false;
  return node.children.some(child => 
    matchIds.includes(child.id) || hasMatchingDescendant(child, matchIds)
  );
};

export default function SheetCard({ sheet, depth = 0, matchingSheetIds = [], searchActive = false }) {
  const navigate = useNavigate();
  
  // Decide initial expanded state
  const shouldExpand = searchActive && hasMatchingDescendant(sheet, matchingSheetIds);
  const [expanded, setExpanded] = useState(shouldExpand);
  const [children, setChildren] = useState(sheet.children || []);
  const [loading, setLoading] = useState(false);

  const usedPct = sheet.totalArea > 0 ? (sheet.usedArea / sheet.totalArea) * 100 : 0;
  const statusCfg = STATUS_CONFIG[sheet.status] || STATUS_CONFIG.active;
  const StatusIcon = statusCfg.icon;
  const weight = calculateWeight(sheet);

  // Sync children when sheet.children changes (like when search mode is triggered)
  useEffect(() => {
    if (sheet.children) {
      setChildren(sheet.children);
    }
  }, [sheet.children]);

  // Automatically expand if search is active and descendants match
  useEffect(() => {
    if (searchActive && hasMatchingDescendant(sheet, matchingSheetIds)) {
      setExpanded(true);
    }
  }, [searchActive, matchingSheetIds, sheet]);

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

  const isNested = depth > 0;
  const isHighlighted = searchActive && matchingSheetIds.includes(sheet.id);

  // Premium responsive card styling for highlighted and nested cards
  const getCardClass = () => {
    const base = "flex flex-col bg-bg-surface transition-all duration-300 group animate-fade-in theme-transition";
    
    if (isHighlighted) {
      if (isNested) {
        // Highlighting for nested (Son) cards
        return `${base} border border-primary border-l-4 border-l-primary bg-primary/5 rounded-lg p-3 my-2 shadow-[0_0_12px_rgba(var(--color-primary-rgb),0.12)]`;
      } else {
        // Highlighting for root (Main) cards
        return `${base} rounded-xl border-2 border-primary bg-primary/5 shadow-lg shadow-primary/10 p-4`;
      }
    } else {
      if (isNested) {
        // Nested card regular styling
        return `${base} border-l-2 border-l-primary/30 pl-3 mt-3`;
      } else {
        // Root card regular styling
        return `${base} rounded-xl border border-border hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 p-4`;
      }
    }
  };

  return (
    <div className={getCardClass()}>
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
            <h3 className={`font-semibold leading-tight flex items-center gap-1.5 ${isNested ? 'text-sm' : 'text-base'} ${isHighlighted ? 'text-primary font-bold' : 'text-text-primary'}`}>
              {isNested && <GitBranch className={`w-3.5 h-3.5 ${isHighlighted ? 'text-primary' : 'text-text-muted'}`} />}
              <span className={isHighlighted ? 'underline decoration-primary/40 decoration-2 underline-offset-2' : ''}>
                {sheet.sheetNumber}
              </span>
            </h3>
            <p className="text-[11px] text-text-secondary mt-0.5">
              {sheet.grade} • {sheet.supplier}{sheet.density > 0 ? ` • ${(sheet.density * 1000000).toFixed(2)} g/cm³` : ""}
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
              <SheetCard 
                key={child.id} 
                sheet={child} 
                depth={depth + 1} 
                matchingSheetIds={matchingSheetIds}
                searchActive={searchActive}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
