// ============================================================
// PHH Inventory — Genealogy Tree (Mother → Son → Son)
// ============================================================

import { GitBranch, ChevronRight, Square } from "lucide-react";

const STATUS_DOT = {
  active: "bg-success",
  depleted: "bg-warning",
  archived: "bg-scrap",
};

function TreeNode({ node, currentId, onSelect, depth = 0 }) {
  const isCurrent = node.id === currentId;

  return (
    <div className={depth > 0 ? "ml-5 mt-1" : ""}>
      {/* Connector line */}
      {depth > 0 && (
        <div className="flex items-center gap-1 mb-0.5">
          <ChevronRight className="w-3 h-3 text-text-muted" />
        </div>
      )}
      {/* Node */}
      <button
        onClick={() => onSelect(node.id)}
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all w-full text-left cursor-pointer ${
          isCurrent
            ? "bg-primary/15 text-primary ring-1 ring-primary/30"
            : "hover:bg-bg-elevated text-text-secondary hover:text-text-primary"
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            STATUS_DOT[node.status] || STATUS_DOT.active
          }`}
        />
        <span className="truncate font-semibold">{node.sheetNumber}</span>
        <span className="text-text-muted ml-auto text-[10px] tabular-nums shrink-0">
          {node.length}×{node.width}
        </span>
      </button>
      {/* Children */}
      {node.children?.length > 0 && (
        <div className="border-l border-border/50 ml-2">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              currentId={currentId}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function GenealogyTree({ tree, currentId, onSelect }) {
  if (!tree) return null;

  return (
    <div className="space-y-1">
      <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2 mb-2">
        <GitBranch className="w-3.5 h-3.5" /> Genealogy
      </h3>
      <TreeNode node={tree} currentId={currentId} onSelect={onSelect} />
    </div>
  );
}
