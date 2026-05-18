// ============================================================
// PHH Inventory — Master Sheet Canvas (react-konva)
// Refactored: zoom, pan, touch support, hit areas, z-10
// ============================================================

import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { Stage, Layer, Rect, Circle, Line, Text, Group } from "react-konva";
import { validatePlacement } from "./CollisionEngine";
import { useTheme } from "../layout/ThemeProvider";

const GRID_SIZE = 10; // mm

// Shape colors (theme-invariant)
const SHAPE_COLORS = {
  rectangle: { fill: "rgba(59,130,246,0.5)", stroke: "#3b82f6" },
  circle: { fill: "rgba(139,92,246,0.5)", stroke: "#8b5cf6" },
  triangle: { fill: "rgba(245,158,11,0.5)", stroke: "#f59e0b" },
};

const INVALID_COLOR = { fill: "rgba(239,68,68,0.35)", stroke: "#ef4444" };

const CANVAS_THEMES = {
  dark: {
    bg: "#0f172a",
    sheet: "#1e293b",
    sheetStroke: "#475569",
    grid: "#334155",
    text: "#64748b",
    kerfText: "#475569",
  },
  light: {
    bg: "#f8fafc",
    sheet: "#e2e8f0",
    sheetStroke: "#94a3b8",
    grid: "#cbd5e1",
    text: "#475569",
    kerfText: "#94a3b8",
  },
};

export default function MasterSheetCanvas({ sheet, cuttings, onPositionUpdate }) {
  const containerRef = useRef(null);
  const { isDark } = useTheme();
  const palette = isDark ? CANVAS_THEMES.dark : CANVAS_THEMES.light;

  const [canvasWidth, setCanvasWidth] = useState(700);
  const canvasHeight = 420;
  const [dragState, setDragState] = useState(null);

  // Zoom & Pan state
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const lastCenter = useRef(null);
  const lastDist = useRef(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width);
        if (w > 0) setCanvasWidth(w);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const CANVAS_PADDING = 50;
  const baseScale = useMemo(() => {
    const availW = canvasWidth - CANVAS_PADDING * 2;
    const availH = canvasHeight - CANVAS_PADDING * 2;
    const scaleX = availW / sheet.length;
    const scaleY = availH / sheet.width;
    return Math.min(scaleX, scaleY);
  }, [sheet.length, sheet.width, canvasWidth, canvasHeight]);

  const sheetPixelW = sheet.length * baseScale;
  const sheetPixelH = sheet.width * baseScale;
  const offsetX = (canvasWidth - sheetPixelW) / 2;
  const offsetY = (canvasHeight - sheetPixelH) / 2;

  const snapToGrid = (val) => Math.round(val / GRID_SIZE) * GRID_SIZE;

  // Zoom handler
  const handleWheel = (e) => {
    e.evt.preventDefault();
    const scaleBy = 1.05;
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    let newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    newScale = Math.max(0.5, Math.min(newScale, 5));

    setStageScale(newScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  };

  // Pinch-to-zoom handlers
  const getDistance = (p1, p2) => Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  const getCenter = (p1, p2) => ({ x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 });

  const handleTouchMove = (e) => {
    e.evt.preventDefault();
    const touch1 = e.evt.touches[0];
    const touch2 = e.evt.touches[1];

    if (touch1 && touch2) {
      if (e.target.getStage().isDragging()) e.target.getStage().stopDrag();

      const stage = e.target.getStage();
      const p1 = { x: touch1.clientX, y: touch1.clientY };
      const p2 = { x: touch2.clientX, y: touch2.clientY };

      const dist = getDistance(p1, p2);
      if (!lastDist.current) lastDist.current = dist;

      const center = getCenter(p1, p2);
      const pointTo = {
        x: (center.x - stage.x()) / stage.scaleX(),
        y: (center.y - stage.y()) / stage.scaleX(),
      };

      const scaleBy = dist / lastDist.current;
      const oldScale = stage.scaleX();
      let newScale = oldScale * scaleBy;
      newScale = Math.max(0.5, Math.min(newScale, 5));

      setStageScale(newScale);
      setStagePos({
        x: center.x - pointTo.x * newScale,
        y: center.y - pointTo.y * newScale,
      });

      lastDist.current = dist;
      lastCenter.current = center;
    }
  };

  const handleTouchEnd = () => {
    lastDist.current = 0;
    lastCenter.current = null;
  };

  const handleDragMove = useCallback(
    (cuttingId, cuttingType, dimensions, e) => {
      const node = e.target;
      const rawX = (node.x() - offsetX) / baseScale;
      const rawY = (node.y() - offsetY) / baseScale;
      const snappedX = snapToGrid(rawX);
      const snappedY = snapToGrid(rawY);

      const dims = typeof dimensions === "string" ? JSON.parse(dimensions) : dimensions;
      const otherCuttings = cuttings.filter((c) => c.id !== cuttingId);
      const result = validatePlacement(sheet, otherCuttings, {
        cuttingType,
        dimensions: dims,
        positionX: snappedX,
        positionY: snappedY,
        rotation: 0,
      });

      setDragState({ id: cuttingId, valid: result.valid });
    },
    [cuttings, sheet, offsetX, offsetY, baseScale]
  );

  const handleDragEnd = useCallback(
    (cuttingId, cuttingType, dimensions, e) => {
      const node = e.target;
      const newX = snapToGrid((node.x() - offsetX) / baseScale);
      const newY = snapToGrid((node.y() - offsetY) / baseScale);

      const dims = typeof dimensions === "string" ? JSON.parse(dimensions) : dimensions;
      const otherCuttings = cuttings.filter((c) => c.id !== cuttingId);
      const result = validatePlacement(sheet, otherCuttings, {
        cuttingType,
        dimensions: dims,
        positionX: newX,
        positionY: newY,
        rotation: 0,
      });

      setDragState(null);

      if (result.valid && onPositionUpdate) {
        onPositionUpdate(cuttingId, { positionX: newX, positionY: newY });
      } else {
        // Snap back on invalid
        const originalCut = cuttings.find(c => c.id === cuttingId);
        if (originalCut) {
          node.x(offsetX + originalCut.positionX * baseScale);
          node.y(offsetY + originalCut.positionY * baseScale);
        }
      }
    },
    [cuttings, sheet, offsetX, offsetY, baseScale, onPositionUpdate]
  );

  const gridLines = useMemo(() => {
    const lines = [];
    const gridPx = GRID_SIZE * baseScale;
    if (gridPx < 4) return lines;

    for (let x = 0; x <= sheetPixelW; x += gridPx) {
      lines.push(
        <Line
          key={`v-${x}`}
          points={[offsetX + x, offsetY, offsetX + x, offsetY + sheetPixelH]}
          stroke={palette.grid}
          strokeWidth={0.5}
          opacity={0.4}
        />
      );
    }
    for (let y = 0; y <= sheetPixelH; y += gridPx) {
      lines.push(
        <Line
          key={`h-${y}`}
          points={[offsetX, offsetY + y, offsetX + sheetPixelW, offsetY + y]}
          stroke={palette.grid}
          strokeWidth={0.5}
          opacity={0.4}
        />
      );
    }
    return lines;
  }, [sheetPixelW, sheetPixelH, offsetX, offsetY, baseScale, palette.grid]);

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-lg overflow-hidden border border-border/50 theme-transition z-10"
    >
      <Stage
        width={canvasWidth}
        height={canvasHeight}
        draggable
        onWheel={handleWheel}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePos.x}
        y={stagePos.y}
        onDragEnd={(e) => {
          if (e.target === e.target.getStage()) {
            setStagePos({ x: e.target.x(), y: e.target.y() });
          }
        }}
      >
        <Layer listening={false}>
          <Rect
            x={-canvasWidth * 5}
            y={-canvasHeight * 5}
            width={canvasWidth * 10}
            height={canvasHeight * 10}
            fill={palette.bg}
          />
          <Rect
            x={offsetX}
            y={offsetY}
            width={sheetPixelW}
            height={sheetPixelH}
            fill={palette.sheet}
            stroke={palette.sheetStroke}
            strokeWidth={2}
            cornerRadius={2}
          />
          {gridLines}
          <Text
            x={offsetX + sheetPixelW / 2 - 30}
            y={offsetY + sheetPixelH + 12}
            text={`${sheet.length} mm`}
            fill={palette.text}
            fontSize={11}
            fontFamily="Inter, sans-serif"
            align="center"
          />
          <Text
            x={offsetX - 38}
            y={offsetY + sheetPixelH / 2 + 15}
            text={`${sheet.width} mm`}
            fill={palette.text}
            fontSize={11}
            fontFamily="Inter, sans-serif"
            rotation={-90}
          />
          <Text
            x={offsetX}
            y={offsetY - 20}
            text={`Kerf: ${sheet.kerfAllowance} mm`}
            fill={palette.kerfText}
            fontSize={10}
            fontFamily="Inter, sans-serif"
          />
        </Layer>

        <Layer>
          {cuttings.map((cut) => {
            const isBeingDragged = dragState?.id === cut.id;
            const isDragInvalid = isBeingDragged && !dragState.valid;

            return (
              <CuttingShapeKonva
                key={cut.id}
                cutting={cut}
                scale={baseScale}
                offsetX={offsetX}
                offsetY={offsetY}
                isInvalid={isDragInvalid}
                onDragMove={(e) => handleDragMove(cut.id, cut.cuttingType, cut.dimensions, e)}
                onDragEnd={(e) => handleDragEnd(cut.id, cut.cuttingType, cut.dimensions, e)}
              />
            );
          })}
        </Layer>
      </Stage>

      <div className="absolute top-2 right-2 flex flex-col gap-2 z-20">
        <button
          onClick={() => {
            setStageScale(1);
            setStagePos({ x: 0, y: 0 });
          }}
          className="bg-bg-elevated/90 hover:bg-bg-hover text-text-secondary hover:text-text-primary px-3 py-1.5 rounded shadow-sm text-xs font-medium border border-border transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          Reset View
        </button>
      </div>

      <div className="flex items-center justify-between px-4 py-2 text-xs text-text-muted border-t border-border/50 bg-bg-surface/70 backdrop-blur-sm theme-transition">
        <span className="font-medium">{cuttings.length} cut(s) placed</span>
        <span>Grid: {GRID_SIZE}mm snap</span>
        {dragState && (
          <span className={`font-semibold ${dragState.valid ? "text-success" : "text-danger"}`}>
            {dragState.valid ? "✓ Valid position" : "✗ Invalid — collision detected"}
          </span>
        )}
      </div>
    </div>
  );
}

function CuttingShapeKonva({ cutting, scale, offsetX, offsetY, isInvalid, onDragMove, onDragEnd }) {
  const { cuttingType, dimensions, positionX, positionY, jobNumber } = cutting;
  const normalColors = SHAPE_COLORS[cuttingType] || SHAPE_COLORS.rectangle;
  const colors = isInvalid ? INVALID_COLOR : normalColors;
  const dims = typeof dimensions === "string" ? JSON.parse(dimensions) : dimensions;

  const pixelX = offsetX + positionX * scale;
  const pixelY = offsetY + positionY * scale;

  const commonProps = {
    x: pixelX,
    y: pixelY,
    draggable: true,
    onDragMove,
    onDragEnd,
    onMouseEnter: (e) => {
      e.target.getStage().container().style.cursor = "grab";
    },
    onMouseLeave: (e) => {
      e.target.getStage().container().style.cursor = "default";
    },
    onDragStart: (e) => {
      e.target.getStage().container().style.cursor = "grabbing";
    },
  };

  // hitStrokeWidth makes the touch/grab area wider than the visible stroke
  switch (cuttingType) {
    case "rectangle":
      return (
        <Group {...commonProps}>
          <Rect
            width={dims.length * scale}
            height={dims.width * scale}
            fill={colors.fill}
            stroke={colors.stroke}
            strokeWidth={isInvalid ? 2.5 : 1.5}
            hitStrokeWidth={20}
            cornerRadius={1}
            shadowColor={isInvalid ? "#ef4444" : colors.stroke}
            shadowBlur={isInvalid ? 10 : 4}
            shadowOpacity={0.3}
          />
          <Text
            x={6}
            y={5}
            text={jobNumber || `${dims.length}×${dims.width}`}
            fill="white"
            fontSize={Math.max(9, Math.min(12, dims.length * scale * 0.1))}
            fontFamily="Inter, sans-serif"
            fontStyle="bold"
            listening={false}
          />
        </Group>
      );

    case "circle":
      return (
        <Group {...commonProps}>
          <Circle
            radius={dims.radius * scale}
            fill={colors.fill}
            stroke={colors.stroke}
            strokeWidth={isInvalid ? 2.5 : 1.5}
            hitStrokeWidth={20}
            shadowColor={isInvalid ? "#ef4444" : colors.stroke}
            shadowBlur={isInvalid ? 10 : 4}
            shadowOpacity={0.3}
          />
          <Text
            x={-18}
            y={-6}
            text={jobNumber || `r=${dims.radius}`}
            fill="white"
            fontSize={10}
            fontFamily="Inter, sans-serif"
            fontStyle="bold"
            listening={false}
          />
        </Group>
      );

    case "triangle":
      return (
        <Group {...commonProps}>
          <Line
            points={[
              0, dims.height * scale,
              (dims.base * scale) / 2, 0,
              dims.base * scale, dims.height * scale,
            ]}
            closed
            fill={colors.fill}
            stroke={colors.stroke}
            strokeWidth={isInvalid ? 2.5 : 1.5}
            hitStrokeWidth={20}
            shadowColor={isInvalid ? "#ef4444" : colors.stroke}
            shadowBlur={isInvalid ? 10 : 4}
            shadowOpacity={0.3}
          />
          <Text
            x={6}
            y={dims.height * scale - 16}
            text={jobNumber || `${dims.base}×${dims.height}`}
            fill="white"
            fontSize={10}
            fontFamily="Inter, sans-serif"
            fontStyle="bold"
            listening={false}
          />
        </Group>
      );

    default:
      return null;
  }
}
