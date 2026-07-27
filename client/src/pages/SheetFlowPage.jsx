// ============================================================
// PHH Inventory — Sheet Flow (genealogy + orders) Canvas
// Shows a sheet's genealogy as a top-to-bottom flowchart, with the
// mother/son sheets as green nodes and their cutting orders as orange
// nodes — matching the CANVAS reference in the spec.
// ============================================================

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, ZoomIn, ZoomOut, Maximize2, Loader2, GitBranch,
  Package, Scissors, ExternalLink, Search, X,
} from "lucide-react";
import { sheetApi, cuttingApi } from "../lib/api";
import { formatArea } from "../lib/calculations";

// ── Layout constants ──
const CARD_W = 230;
const SLOT_H = 150;   // vertical slot per level (card + breathing room)
const H_GAP = 48;
const V_GAP = 70;
const PAD = 90;

// ── Generic top-to-bottom tree layout (works on node.children) ──
function layoutTree(node, x = 0, y = 0) {
  const positions = [];
  const connectors = [];
  const kids = node.children || [];

  if (kids.length === 0) {
    positions.push({ ...node, x, y });
    return { positions, connectors, width: CARD_W };
  }

  const childLayouts = [];
  let totalW = 0;
  kids.forEach((child, i) => {
    const cl = layoutTree(child, 0, y + SLOT_H + V_GAP);
    childLayouts.push(cl);
    totalW += cl.width;
    if (i < kids.length - 1) totalW += H_GAP;
  });

  const treeW = Math.max(CARD_W, totalW);
  const parentX = x + (treeW - CARD_W) / 2;
  positions.push({ ...node, x: parentX, y });

  let childX = x + (treeW - totalW) / 2;
  childLayouts.forEach((cl) => {
    const offsetX = childX + (cl.width - CARD_W) / 2;
    cl.positions.forEach((p) => positions.push({ ...p, x: p.x + offsetX }));
    connectors.push({
      fromX: parentX + CARD_W / 2,
      fromY: y + SLOT_H,
      toX: offsetX + CARD_W / 2,
      toY: y + SLOT_H + V_GAP,
    });
    cl.connectors.forEach((c) =>
      connectors.push({ fromX: c.fromX + offsetX, fromY: c.fromY, toX: c.toX + offsetX, toY: c.toY })
    );
    childX += cl.width + H_GAP;
  });

  return { positions, connectors, width: treeW };
}

function Connector({ from, to }) {
  const midY = (from.y + to.y) / 2;
  const d = `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`;
  return (
    <g>
      <path d={d} fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeOpacity="0.5" strokeLinecap="round" />
      <circle cx={to.x} cy={to.y} r="4" fill="var(--color-primary)" fillOpacity="0.6" />
    </g>
  );
}

// ── Order (cutting) node — orange ──
function fmtDims(d) {
  if (!d) return "";
  if (d.radius != null) return `⌀${d.radius}`;
  if (d.base != null) return `${d.base}×${d.height} (tri)`;
  if (d.length != null) return `${d.length}×${d.width}`;
  return "";
}

function OrderCard({ node }) {
  return (
    <div className="w-[230px] rounded-xl border-2 border-amber-400/60 bg-amber-400/10 p-3 shadow-sm select-none">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase bg-amber-400/20 text-amber-600 dark:text-amber-300">
          <Scissors className="w-2.5 h-2.5" /> Order
        </span>
        <h4 className="text-sm font-bold text-text-primary truncate">#{node.jobNumber}</h4>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-text-secondary">
        <span className="font-medium bg-bg-elevated/60 px-1.5 py-0.5 rounded capitalize">{node.cuttingType}</span>
        <span className="font-mono bg-bg-elevated/40 px-1.5 py-0.5 rounded border border-border/50">{fmtDims(node.dimensions)}</span>
      </div>
      <p className="text-[10px] text-text-muted mt-1.5">Cut area {formatArea(node.cutArea || 0)}</p>
    </div>
  );
}

// ── Sheet node — green ──
const SHEET_COLOR = {
  active: "border-success/50 bg-success/5",
  depleted: "border-warning/50 bg-warning/5",
  archived: "border-scrap/50 bg-scrap/5",
};

function SheetCard({ node, isRoot, onOpen }) {
  const usedPct = node.totalArea > 0 ? Math.min((node.usedArea / node.totalArea) * 100, 100) : 0;
  return (
    <div className={`relative w-[230px] rounded-xl border-2 p-3 shadow-sm select-none ${SHEET_COLOR[node.status] || SHEET_COLOR.active}`}>
      {isRoot && (
        <div className="absolute -top-2.5 left-3 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest bg-primary text-white shadow-sm">
          Main Sheet
        </div>
      )}
      <div className="flex items-start justify-between mt-1 mb-1.5">
        <div className="min-w-0 pr-1">
          <h4 className="text-sm font-bold text-text-primary truncate flex items-center gap-1">
            {node.parentId ? <GitBranch className="w-3 h-3 text-text-muted" /> : <Package className="w-3 h-3 text-success" />}
            {node.sheetNumber}
          </h4>
          <p className="text-[10px] text-text-muted truncate mt-0.5">{node.grade}</p>
        </div>
        <span className="shrink-0 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-bg-elevated text-text-secondary capitalize">
          {node.status}
        </span>
      </div>
      <div className="text-[10px] text-text-secondary mb-2 font-medium bg-bg-elevated/60 px-1.5 py-0.5 rounded inline-block">
        {node.length}×{node.width}×{node.thickness}
      </div>
      <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden mb-2">
        <div className="h-full rounded-full" style={{ width: `${usedPct}%`, background: usedPct > 80 ? "var(--color-danger)" : usedPct > 50 ? "var(--color-warning)" : "var(--color-primary)" }} />
      </div>
      <button
        onClick={() => onOpen(node.id)}
        className="flex items-center justify-center gap-1 text-[10px] font-semibold text-primary hover:text-primary-light w-full py-1 rounded-md hover:bg-primary/5 transition-colors cursor-pointer"
      >
        View Details <ExternalLink className="w-3 h-3" />
      </button>
    </div>
  );
}

// ── Build an augmented tree: each sheet's children = [order nodes] + [child sheets] ──
function collectIds(node, acc = []) {
  acc.push(node.id);
  (node.children || []).forEach((c) => collectIds(c, acc));
  return acc;
}

function augment(sheet, cutsBySheet) {
  const orders = (cutsBySheet[sheet.id] || []).map((c) => ({
    id: `order-${c.id}`,
    nodeType: "order",
    jobNumber: c.jobNumber,
    cuttingType: c.cuttingType,
    dimensions: c.dimensions,
    cutArea: c.cutArea,
    children: [],
  }));
  const childSheets = (sheet.children || []).map((ch) => augment(ch, cutsBySheet));
  return { ...sheet, nodeType: "sheet", children: [...orders, ...childSheets] };
}

export default function SheetFlowPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);

  // A node matches the search by sheet number (sheets) or job number (orders).
  const nodeMatches = (p, q) => {
    if (!q) return true;
    const s = q.trim().toLowerCase().replace(/^#/, "");
    if (!s) return true;
    if (p.nodeType === "order") return String(p.jobNumber).toLowerCase().includes(s);
    return String(p.sheetNumber).toLowerCase().includes(s);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const genRes = await sheetApi.getGenealogy(id);
        const root = genRes.data.data;
        if (!root) throw new Error("No genealogy found");
        const ids = collectIds(root);
        const results = await Promise.all(ids.map((sid) => cuttingApi.list(sid)));
        const cutsBySheet = {};
        ids.forEach((sid, i) => {
          cutsBySheet[sid] = results[i].data.data || results[i].data || [];
        });
        if (alive) setTree(augment(root, cutsBySheet));
      } catch (err) {
        console.error(err);
        if (alive) setError("Failed to load sheet flow");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  const { positions, connectors, canvasW, canvasH } = useMemo(() => {
    if (!tree) return { positions: [], connectors: [], canvasW: 0, canvasH: 0 };
    const l = layoutTree(tree, PAD, PAD);
    let w = PAD * 2, h = PAD * 2;
    l.positions.forEach((p) => {
      w = Math.max(w, p.x + CARD_W + PAD);
      h = Math.max(h, p.y + SLOT_H + PAD);
    });
    return { positions: l.positions, connectors: l.connectors, canvasW: w, canvasH: h };
  }, [tree]);

  const zoom = useCallback((d) => setScale((s) => Math.max(0.3, Math.min(2.5, s + d))), []);
  const fit = useCallback(() => {
    if (!containerRef.current || !canvasW) return;
    const r = containerRef.current.getBoundingClientRect();
    const ns = Math.max(0.3, Math.min(1.4, Math.min((r.width - 60) / canvasW, (r.height - 60) / canvasH)));
    setScale(ns);
    setTranslate({ x: Math.max(20, (r.width - canvasW * ns) / 2), y: 30 });
  }, [canvasW, canvasH]);

  useEffect(() => { if (tree) fit(); }, [tree, fit]);

  const onWheel = useCallback((e) => { e.preventDefault(); zoom(e.deltaY > 0 ? -0.08 : 0.08); }, [zoom]);
  const onDown = useCallback((e) => {
    if (e.target.closest(".flow-node")) return;
    setPanning(true); setPanStart({ x: e.clientX - translate.x, y: e.clientY - translate.y });
  }, [translate]);
  const onMove = useCallback((e) => { if (panning) setTranslate({ x: e.clientX - panStart.x, y: e.clientY - panStart.y }); }, [panning, panStart]);
  const onUp = useCallback(() => setPanning(false), []);

  const counts = useMemo(() => {
    const sheets = positions.filter((p) => p.nodeType !== "order").length;
    const orders = positions.filter((p) => p.nodeType === "order").length;
    return { sheets, orders };
  }, [positions]);

  const matchCount = useMemo(() => {
    if (!query.trim()) return null;
    return positions.filter((p) => nodeMatches(p, query)).length;
  }, [positions, query]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-bg-base">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-text-muted">Loading flow...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-bg-base">
      {/* Top bar */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-border bg-bg-surface theme-transition z-10">
        <button onClick={() => navigate(`/sheets/${id}`)} className="p-1.5 rounded-lg hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors cursor-pointer">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-primary shrink-0" /> Sheet Flow
          </h1>
          <p className="text-[10px] text-text-muted mt-0.5">
            {counts.sheets} sheets • {counts.orders} orders
            {matchCount !== null && <span className="text-primary"> • {matchCount} match{matchCount === 1 ? "" : "es"}</span>}
          </p>
        </div>
        {/* Search by sheet / order number */}
        <div className="relative shrink-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sheet / order #"
            className="w-52 h-8 pl-8 pr-7 text-xs bg-bg-elevated border border-border rounded-lg focus:outline-none focus:border-primary text-text-primary placeholder:text-text-muted"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer"
              title="Clear"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {/* Legend */}
        <div className="hidden sm:flex items-center gap-3 mr-2">
          <span className="flex items-center gap-1.5 text-[10px] text-text-secondary"><span className="w-3 h-3 rounded border-2 border-success/60 bg-success/10" /> Sheet</span>
          <span className="flex items-center gap-1.5 text-[10px] text-text-secondary"><span className="w-3 h-3 rounded border-2 border-amber-400/70 bg-amber-400/20" /> Order</span>
        </div>
        <div className="flex items-center gap-1 bg-bg-elevated rounded-lg p-0.5 border border-border shrink-0">
          <button onClick={() => zoom(-0.15)} className="p-1.5 rounded-md hover:bg-bg-hover text-text-muted hover:text-text-primary cursor-pointer" title="Zoom Out"><ZoomOut className="w-3.5 h-3.5" /></button>
          <span className="text-[10px] font-mono font-bold text-text-secondary w-10 text-center tabular-nums">{Math.round(scale * 100)}%</span>
          <button onClick={() => zoom(0.15)} className="p-1.5 rounded-md hover:bg-bg-hover text-text-muted hover:text-text-primary cursor-pointer" title="Zoom In"><ZoomIn className="w-3.5 h-3.5" /></button>
          <div className="w-px h-4 bg-border" />
          <button onClick={fit} className="p-1.5 rounded-md hover:bg-bg-hover text-text-muted hover:text-text-primary cursor-pointer" title="Fit to Screen"><Maximize2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className={`flex-1 overflow-hidden relative ${panning ? "cursor-grabbing" : "cursor-grab"}`}
        onWheel={onWheel} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
      >
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle, var(--color-border) 1px, transparent 1px)", backgroundSize: `${20 * scale}px ${20 * scale}px`, backgroundPosition: `${translate.x % (20 * scale)}px ${translate.y % (20 * scale)}px` }} />
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-danger">{error}</div>
        ) : (
          <div className="absolute" style={{ transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`, transformOrigin: "0 0", width: canvasW, height: canvasH, transition: panning ? "none" : "transform 0.15s ease-out" }}>
            <svg className="absolute top-0 left-0 pointer-events-none" width={canvasW} height={canvasH} style={{ overflow: "visible" }}>
              {connectors.map((c, i) => (
                <Connector key={i} from={{ x: c.fromX, y: c.fromY }} to={{ x: c.toX, y: c.toY }} />
              ))}
            </svg>
            {positions.map((p) => {
              const dim = query.trim() && !nodeMatches(p, query);
              return (
                <div
                  key={p.id}
                  className="flow-node absolute"
                  style={{ left: p.x, top: p.y, width: CARD_W, opacity: dim ? 0.2 : 1, transition: "opacity 0.2s" }}
                >
                  {p.nodeType === "order"
                    ? <OrderCard node={p} />
                    : <SheetCard node={p} isRoot={!p.parentId} onOpen={(sid) => navigate(`/sheets/${sid}`)} />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
