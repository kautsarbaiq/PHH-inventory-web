// ============================================================
// PHH Inventory — Group Canvas Page
// Interactive flowchart visualization of sheet genealogy trees
// Layout: Top-to-Bottom (Main Sheet on top, Sons below)
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Plus,
  Search,
  X,
  Loader2,
  GitBranch,
  ChevronDown,
} from "lucide-react";
import { groupApi, sheetApi } from "../lib/api";
import FlowchartCard from "../components/canvas/FlowchartCard";

// ── Layout Constants ──
const CARD_WIDTH = 220;
const CARD_HEIGHT = 170;
const H_GAP = 60;   // horizontal gap between sibling cards
const V_GAP = 80;    // vertical gap between parent and children
const TREE_GAP = 100; // horizontal gap between separate trees
const PADDING = 80;   // canvas padding

// ── Tree Layout Algorithm (top-to-bottom) ──
function layoutTree(node, x = 0, y = 0) {
  const positions = [];
  const connectors = [];

  if (!node.children || node.children.length === 0) {
    positions.push({ ...node, x, y, w: CARD_WIDTH });
    return { positions, connectors, width: CARD_WIDTH };
  }

  // Layout children first to determine their widths
  const childLayouts = [];
  let totalChildWidth = 0;

  node.children.forEach((child, i) => {
    const childLayout = layoutTree(child, 0, y + CARD_HEIGHT + V_GAP);
    childLayouts.push(childLayout);
    totalChildWidth += childLayout.width;
    if (i < node.children.length - 1) totalChildWidth += H_GAP;
  });

  // Parent width is max of its own card width or children total width
  const treeWidth = Math.max(CARD_WIDTH, totalChildWidth);

  // Position parent centered above children
  const parentX = x + (treeWidth - CARD_WIDTH) / 2;
  positions.push({ ...node, x: parentX, y, w: CARD_WIDTH });

  // Position children
  let childX = x + (treeWidth - totalChildWidth) / 2;
  childLayouts.forEach((childLayout, i) => {
    const childCenterOffset = (childLayout.width - CARD_WIDTH) / 2;
    const offsetX = childX + childCenterOffset;

    // Remap child positions relative to this tree
    childLayout.positions.forEach((pos) => {
      positions.push({
        ...pos,
        x: pos.x + offsetX,
      });
    });

    // Add connector from parent to child
    const childTopCenter = offsetX + CARD_WIDTH / 2;
    connectors.push({
      fromX: parentX + CARD_WIDTH / 2,
      fromY: y + CARD_HEIGHT,
      toX: childTopCenter,
      toY: y + CARD_HEIGHT + V_GAP,
    });

    // Remap child connectors
    childLayout.connectors.forEach((conn) => {
      connectors.push({
        fromX: conn.fromX + offsetX,
        fromY: conn.fromY,
        toX: conn.toX + offsetX,
        toY: conn.toY,
      });
    });

    childX += childLayout.width + H_GAP;
  });

  return { positions, connectors, width: treeWidth };
}

// ── SVG Connector Line ──
function ConnectorLine({ from, to }) {
  const midY = (from.y + to.y) / 2;
  const d = `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`;

  return (
    <g>
      {/* Glow effect */}
      <path
        d={d}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="4"
        strokeOpacity="0.1"
        strokeLinecap="round"
      />
      {/* Main line */}
      <path
        d={d}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="2"
        strokeOpacity="0.5"
        strokeLinecap="round"
        strokeDasharray="6 3"
      />
      {/* Arrow head */}
      <circle
        cx={to.x}
        cy={to.y}
        r="4"
        fill="var(--color-primary)"
        fillOpacity="0.6"
      />
    </g>
  );
}

// ── Sheet Selector Modal ──
function AddSheetModal({ allSheets, existingSheetIds, onAdd, onClose }) {
  const [search, setSearch] = useState("");
  const filtered = allSheets.filter(
    (s) =>
      !existingSheetIds.includes(s.id) &&
      (s.sheetNumber.toLowerCase().includes(search.toLowerCase()) ||
        s.grade.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-md max-h-[70vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-bold text-text-primary">Add Sheet to Canvas</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b border-border/50">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sheets..."
              className="w-full pl-8 pr-3 py-2 text-xs bg-bg-elevated border border-border rounded-lg focus:outline-none focus:border-primary text-text-primary placeholder:text-text-muted"
              autoFocus
            />
          </div>
        </div>

        {/* Sheet List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-text-muted text-xs">
              No sheets available to add
            </div>
          ) : (
            filtered.map((sheet) => (
              <button
                key={sheet.id}
                onClick={() => onAdd(sheet.id)}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-primary/5 hover:border-primary/20 border border-transparent transition-all cursor-pointer text-left group"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <GitBranch className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-text-primary truncate group-hover:text-primary transition-colors">
                    {sheet.sheetNumber}
                  </p>
                  <p className="text-[10px] text-text-muted truncate">
                    {sheet.grade} • {sheet.length}×{sheet.width}×{sheet.thickness} mm
                  </p>
                </div>
                <Plus className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}


export default function GroupCanvasPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();

  // State
  const [group, setGroup] = useState(null);
  const [trees, setTrees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allSheets, setAllSheets] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);

  // Canvas transform state
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // ── Data Fetching ──
  const fetchGroupData = useCallback(async () => {
    try {
      setLoading(true);
      const [groupRes, sheetsRes] = await Promise.all([
        groupApi.getById(groupId),
        sheetApi.list({ limit: 200 }),
      ]);

      const groupData = groupRes.data.data;
      setGroup(groupData);
      setAllSheets(sheetsRes.data.data || []);

      // Get genealogy trees for all sheets in this group
      if (groupData.sheets && groupData.sheets.length > 0) {
        const sheetIds = groupData.sheets.map((s) => s.id);
        const genealogyRes = await sheetApi.getGenealogyBatch(sheetIds);
        setTrees(genealogyRes.data.data || []);
      } else {
        setTrees([]);
      }
    } catch (err) {
      console.error("Failed to fetch group data:", err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchGroupData();
  }, [fetchGroupData]);

  // ── Add Sheet to Group ──
  const handleAddSheet = async (sheetId) => {
    try {
      const currentSheetIds = group.sheets.map((s) => s.id);
      await groupApi.update(groupId, {
        sheetIds: [...currentSheetIds, sheetId],
      });
      setShowAddModal(false);
      fetchGroupData();
    } catch (err) {
      console.error("Failed to add sheet:", err);
      alert("Failed to add sheet to group");
    }
  };

  // ── Zoom Controls ──
  const handleZoom = useCallback((delta) => {
    setScale((prev) => Math.max(0.2, Math.min(3, prev + delta)));
  }, []);

  const handleFitToScreen = useCallback(() => {
    if (!containerRef.current || layouts.length === 0) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    let maxX = 0, maxY = 0;

    layouts.forEach(({ positions }) => {
      positions.forEach((pos) => {
        maxX = Math.max(maxX, pos.x + CARD_WIDTH + PADDING);
        maxY = Math.max(maxY, pos.y + CARD_HEIGHT + PADDING);
      });
    });

    const scaleX = (containerRect.width - 80) / maxX;
    const scaleY = (containerRect.height - 80) / maxY;
    const newScale = Math.max(0.2, Math.min(1.5, Math.min(scaleX, scaleY)));

    setScale(newScale);
    setTranslate({
      x: (containerRect.width - maxX * newScale) / 2,
      y: 40,
    });
  }, []);

  // ── Mouse Wheel Zoom ──
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setScale((prev) => Math.max(0.2, Math.min(3, prev + delta)));
  }, []);

  // ── Pan Controls ──
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.flowchart-card')) return; // Don't pan when clicking cards
    setIsPanning(true);
    setPanStart({ x: e.clientX - translate.x, y: e.clientY - translate.y });
  }, [translate]);

  const handleMouseMove = useCallback((e) => {
    if (!isPanning) return;
    setTranslate({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y,
    });
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // ── Compute Layouts ──
  const layouts = [];
  let currentX = PADDING;

  trees.forEach((tree, idx) => {
    const layout = layoutTree(tree, currentX, PADDING);
    layouts.push({ ...layout, treeIndex: idx, rootId: tree.id });
    currentX += layout.width + TREE_GAP;
  });

  // Compute total canvas size
  let canvasWidth = PADDING * 2;
  let canvasHeight = PADDING * 2;
  layouts.forEach(({ positions }) => {
    positions.forEach((pos) => {
      canvasWidth = Math.max(canvasWidth, pos.x + CARD_WIDTH + PADDING);
      canvasHeight = Math.max(canvasHeight, pos.y + CARD_HEIGHT + PADDING);
    });
  });

  // ── Loading State ──
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-bg-base">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-text-muted font-medium">Loading canvas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-bg-base">
      {/* ═══ Top Navigation Bar ═══ */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-border bg-bg-surface theme-transition z-10">
        {/* Back button */}
        <button
          onClick={() => navigate("/groups")}
          className="p-1.5 rounded-lg hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Group info */}
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-text-primary leading-tight truncate flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-primary shrink-0" />
            {group?.name || "Group Canvas"}
          </h1>
          <p className="text-[10px] text-text-muted truncate mt-0.5">
            {trees.length} tree{trees.length !== 1 ? "s" : ""} • {layouts.reduce((sum, l) => sum + l.positions.length, 0)} sheets total
          </p>
        </div>

        {/* Add Sheet Button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Sheet
        </button>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-bg-elevated rounded-lg p-0.5 border border-border shrink-0">
          <button
            onClick={() => handleZoom(-0.15)}
            className="p-1.5 rounded-md hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-mono font-bold text-text-secondary w-10 text-center tabular-nums">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => handleZoom(0.15)}
            className="p-1.5 rounded-md hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-border" />
          <button
            onClick={handleFitToScreen}
            className="p-1.5 rounded-md hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            title="Fit to Screen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ═══ Canvas Area ═══ */}
      <div
        ref={containerRef}
        className={`flex-1 overflow-hidden relative ${isPanning ? "cursor-grabbing" : "cursor-grab"}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Grid pattern background */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              radial-gradient(circle, var(--color-border) 1px, transparent 1px)
            `,
            backgroundSize: `${20 * scale}px ${20 * scale}px`,
            backgroundPosition: `${translate.x % (20 * scale)}px ${translate.y % (20 * scale)}px`,
          }}
        />

        {/* Canvas content */}
        <div
          ref={canvasRef}
          className="absolute"
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: "0 0",
            width: canvasWidth,
            height: canvasHeight,
            transition: isPanning ? "none" : "transform 0.15s ease-out",
          }}
        >
          {/* SVG Connectors Layer */}
          <svg
            className="absolute top-0 left-0 pointer-events-none"
            width={canvasWidth}
            height={canvasHeight}
            style={{ overflow: "visible" }}
          >
            {layouts.map(({ connectors }, treeIdx) =>
              connectors.map((conn, connIdx) => (
                <ConnectorLine
                  key={`${treeIdx}-${connIdx}`}
                  from={{ x: conn.fromX, y: conn.fromY }}
                  to={{ x: conn.toX, y: conn.toY }}
                />
              ))
            )}
          </svg>

          {/* Cards Layer */}
          {layouts.map(({ positions }, treeIdx) =>
            positions.map((pos) => (
              <div
                key={pos.id}
                className="flowchart-card absolute"
                style={{
                  left: pos.x,
                  top: pos.y,
                  width: CARD_WIDTH,
                }}
              >
                <FlowchartCard
                  node={pos}
                  isRoot={!pos.parentId}
                  isSelected={selectedNode === pos.id}
                  onSelect={setSelectedNode}
                />
              </div>
            ))
          )}

          {/* Empty State */}
          {trees.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center animate-fade-in">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <GitBranch className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-base font-bold text-text-primary mb-1">
                  No Sheets in Canvas
                </h3>
                <p className="text-xs text-text-muted mb-4 max-w-xs">
                  Add sheets to this group to visualize their genealogy as a flowchart.
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg transition-colors cursor-pointer mx-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add First Sheet
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Minimap (bottom-right) */}
        {layouts.length > 0 && (
          <div className="absolute bottom-3 right-3 w-36 h-24 bg-bg-surface/80 backdrop-blur-md border border-border rounded-lg overflow-hidden shadow-lg z-10">
            <svg width="100%" height="100%" viewBox={`0 0 ${canvasWidth} ${canvasHeight}`} preserveAspectRatio="xMidYMid meet">
              {/* Cards as dots */}
              {layouts.map(({ positions }) =>
                positions.map((pos) => (
                  <rect
                    key={pos.id}
                    x={pos.x}
                    y={pos.y}
                    width={CARD_WIDTH}
                    height={CARD_HEIGHT}
                    rx="8"
                    fill={pos.parentId ? "var(--color-primary)" : "var(--color-success)"}
                    fillOpacity="0.5"
                    stroke={pos.parentId ? "var(--color-primary)" : "var(--color-success)"}
                    strokeWidth="4"
                  />
                ))
              )}
              {/* Connectors */}
              {layouts.map(({ connectors }, treeIdx) =>
                connectors.map((conn, connIdx) => (
                  <line
                    key={`mini-${treeIdx}-${connIdx}`}
                    x1={conn.fromX}
                    y1={conn.fromY}
                    x2={conn.toX}
                    y2={conn.toY}
                    stroke="var(--color-primary)"
                    strokeWidth="3"
                    strokeOpacity="0.4"
                  />
                ))
              )}
              {/* Viewport rectangle */}
              {containerRef.current && (
                <rect
                  x={-translate.x / scale}
                  y={-translate.y / scale}
                  width={containerRef.current.clientWidth / scale}
                  height={containerRef.current.clientHeight / scale}
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth="6"
                  strokeOpacity="0.8"
                  rx="4"
                />
              )}
            </svg>
          </div>
        )}
      </div>

      {/* ═══ Add Sheet Modal ═══ */}
      {showAddModal && (
        <AddSheetModal
          allSheets={allSheets}
          existingSheetIds={group?.sheets?.map((s) => s.id) || []}
          onAdd={handleAddSheet}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
