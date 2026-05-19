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
    text: "#94a3b8",
    kerfText: "#64748b",
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

export default function MasterSheetCanvas({ sheet, cuttings, onPositionUpdate, newCuttingPreview }) {
  const containerRef = useRef(null);
  const { isDark } = useTheme();
  const palette = isDark ? CANVAS_THEMES.dark : CANVAS_THEMES.light;

  const previewCut = useMemo(() => {
    if (!newCuttingPreview) return null;
    const { cuttingType, dimensions, positionX, positionY, jobNumber } = newCuttingPreview;

    // Validate that inputs are valid positive numbers
    let validDims = false;
    if (cuttingType === "rectangle" && dimensions.length > 0 && dimensions.width > 0) validDims = true;
    if (cuttingType === "circle" && dimensions.radius > 0) validDims = true;
    if (cuttingType === "triangle" && dimensions.base > 0 && dimensions.height > 0) validDims = true;

    if (!validDims) return null;

    const posX = parseFloat(positionX) || 0;
    const posY = parseFloat(positionY) || 0;

    // Use validatePlacement to check if it's colliding
    const result = validatePlacement(sheet, cuttings, {
      cuttingType,
      dimensions,
      positionX: posX,
      positionY: posY,
      rotation: 0,
    });

    return {
      cuttingType,
      dimensions,
      positionX: posX,
      positionY: posY,
      jobNumber: jobNumber || "DRAFT",
      isInvalid: !result.valid,
    };
  }, [newCuttingPreview, sheet, cuttings]);

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

      setDragState({
        id: cuttingId,
        valid: result.valid,
        x: Math.round(snappedX),
        y: Math.round(snappedY),
      });
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

  const tickInterval = useMemo(() => {
    const len = sheet.length;
    if (len <= 1000) return 100;
    if (len <= 5000) return 500;
    if (len <= 10000) return 1000;
    if (len <= 30000) return 2000;
    return 5000;
  }, [sheet.length]);

  const axisTicks = useMemo(() => {
    const ticks = [];
    const interval = tickInterval;

    // X Axis Ticks (Horizontal, along the top of the sheet)
    for (let x = 0; x <= sheet.length; x += interval) {
      const pxX = offsetX + x * baseScale;
      ticks.push(
        <Group key={`x-tick-${x}`}>
          <Line
            points={[pxX, offsetY, pxX, offsetY - 5]}
            stroke={palette.text}
            strokeWidth={1}
            opacity={0.5}
          />
          <Text
            x={pxX - 15}
            y={offsetY - 14}
            width={30}
            text={x.toString()}
            fill={palette.text}
            fontSize={7.5}
            fontFamily="Inter, sans-serif"
            align="center"
            opacity={0.7}
          />
        </Group>
      );
    }

    // Y Axis Ticks (Vertical, along the left of the sheet)
    for (let y = 0; y <= sheet.width; y += interval) {
      const pxY = offsetY + y * baseScale;
      ticks.push(
        <Group key={`y-tick-${y}`}>
          <Line
            points={[offsetX, pxY, offsetX - 5, pxY]}
            stroke={palette.text}
            strokeWidth={1}
            opacity={0.5}
          />
          <Text
            x={offsetX - 26}
            y={pxY - 3}
            width={20}
            text={y.toString()}
            fill={palette.text}
            fontSize={7.5}
            fontFamily="Inter, sans-serif"
            align="right"
            opacity={0.7}
          />
        </Group>
      );
    }

    return ticks;
  }, [sheet.length, sheet.width, offsetX, offsetY, baseScale, palette.text, tickInterval]);

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
          {axisTicks}
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
            const dragCoords = isBeingDragged ? { x: dragState.x, y: dragState.y } : null;

            return (
              <CuttingShapeKonva
                key={cut.id}
                cutting={cut}
                scale={baseScale}
                offsetX={offsetX}
                offsetY={offsetY}
                isInvalid={isDragInvalid}
                dragCoords={dragCoords}
                onDragMove={(e) => handleDragMove(cut.id, cut.cuttingType, cut.dimensions, e)}
                onDragEnd={(e) => handleDragEnd(cut.id, cut.cuttingType, cut.dimensions, e)}
              />
            );
          })}
          {previewCut && (
            <CuttingShapeKonva
              cutting={previewCut}
              scale={baseScale}
              offsetX={offsetX}
              offsetY={offsetY}
              isInvalid={previewCut.isInvalid}
              isPreview={true}
            />
          )}
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

function CuttingShapeKonva({ cutting, scale, offsetX, offsetY, isInvalid, dragCoords, onDragMove, onDragEnd, isPreview }) {
  const { cuttingType, dimensions, positionX, positionY, jobNumber } = cutting;
  const normalColors = SHAPE_COLORS[cuttingType] || SHAPE_COLORS.rectangle;
  const colors = isInvalid ? INVALID_COLOR : normalColors;
  const dims = typeof dimensions === "string" ? JSON.parse(dimensions) : dimensions;

  const pixelX = offsetX + positionX * scale;
  const pixelY = offsetY + positionY * scale;

  const commonProps = {
    x: pixelX,
    y: pixelY,
    draggable: !isPreview,
    onDragMove: isPreview ? undefined : onDragMove,
    onDragEnd: isPreview ? undefined : onDragEnd,
    onMouseEnter: (e) => {
      if (!isPreview) e.target.getStage().container().style.cursor = "grab";
    },
    onMouseLeave: (e) => {
      if (!isPreview) e.target.getStage().container().style.cursor = "default";
    },
    onDragStart: (e) => {
      if (!isPreview) e.target.getStage().container().style.cursor = "grabbing";
    },
  };

  const renderTooltip = () => {
    if (!dragCoords) return null;
    
    let tooltipY = -24;
    let tooltipX = 0;
    
    if (cuttingType === "rectangle") {
      tooltipX = (dims.length * scale) / 2 - 45;
    } else if (cuttingType === "circle") {
      tooltipX = -45;
      tooltipY = -dims.radius * scale - 24;
    } else if (cuttingType === "triangle") {
      tooltipX = (dims.base * scale) / 2 - 45;
    }
    
    return (
      <Group x={tooltipX} y={tooltipY} listening={false}>
        <Rect
          width={90}
          height={18}
          fill="#1e293b"
          stroke={isInvalid ? "#ef4444" : "#3b82f6"}
          strokeWidth={1}
          cornerRadius={3}
          shadowBlur={4}
          shadowColor="black"
          shadowOpacity={0.3}
        />
        <Text
          width={90}
          y={4}
          text={`X:${dragCoords.x} Y:${dragCoords.y}`}
          fill="#f8fafc"
          fontSize={9}
          fontFamily="Inter, sans-serif"
          fontStyle="bold"
          align="center"
        />
      </Group>
    );
  };

  // hitStrokeWidth makes the touch/grab area wider than the visible stroke
  switch (cuttingType) {
    case "rectangle":
      return (
        <Group {...commonProps}>
          {renderTooltip()}
          <Rect
            width={dims.length * scale}
            height={dims.width * scale}
            fill={colors.fill}
            stroke={colors.stroke}
            strokeWidth={isInvalid ? 2.5 : 1.5}
            dash={isPreview ? [4, 4] : undefined}
            opacity={isPreview ? 0.6 : 1}
            hitStrokeWidth={isPreview ? 0 : 20}
            cornerRadius={1}
            shadowColor={isInvalid ? "#ef4444" : colors.stroke}
            shadowBlur={isInvalid ? 10 : 4}
            shadowOpacity={0.3}
          />
          {dims.length * scale > 45 && dims.width * scale > 22 && (
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
          )}
        </Group>
      );

    case "circle":
      return (
        <Group {...commonProps}>
          {renderTooltip()}
          <Circle
            radius={dims.radius * scale}
            fill={colors.fill}
            stroke={colors.stroke}
            strokeWidth={isInvalid ? 2.5 : 1.5}
            dash={isPreview ? [4, 4] : undefined}
            opacity={isPreview ? 0.6 : 1}
            hitStrokeWidth={isPreview ? 0 : 20}
            shadowColor={isInvalid ? "#ef4444" : colors.stroke}
            shadowBlur={isInvalid ? 10 : 4}
            shadowOpacity={0.3}
          />
          {dims.radius * scale > 22 && (
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
          )}
        </Group>
      );

    case "triangle":
      return (
        <Group {...commonProps}>
          {renderTooltip()}
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
            dash={isPreview ? [4, 4] : undefined}
            opacity={isPreview ? 0.6 : 1}
            hitStrokeWidth={isPreview ? 0 : 20}
            shadowColor={isInvalid ? "#ef4444" : colors.stroke}
            shadowBlur={isInvalid ? 10 : 4}
            shadowOpacity={0.3}
          />
          {dims.base * scale > 45 && dims.height * scale > 25 && (
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
          )}
        </Group>
      );

    default:
      return null;
  }
}
