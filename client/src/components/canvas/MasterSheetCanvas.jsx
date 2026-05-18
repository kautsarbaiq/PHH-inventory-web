// ============================================================
// PHH Inventory — Master Sheet Canvas (react-konva)
// With real-time collision detection during drag
// ============================================================

import { useState, useRef, useMemo, useCallback } from "react";
import { Stage, Layer, Rect, Circle, Line, Text, Group } from "react-konva";
import { validatePlacement, getCenterFromTopLeft } from "./CollisionEngine";

const CANVAS_PADDING = 40;
const GRID_SIZE = 10; // mm

// Shape colors
const SHAPE_COLORS = {
  rectangle: { fill: "rgba(59,130,246,0.5)", stroke: "#3b82f6" },
  circle: { fill: "rgba(139,92,246,0.5)", stroke: "#8b5cf6" },
  triangle: { fill: "rgba(245,158,11,0.5)", stroke: "#f59e0b" },
};

const INVALID_COLOR = { fill: "rgba(239,68,68,0.35)", stroke: "#ef4444" };

export default function MasterSheetCanvas({ sheet, cuttings, onPositionUpdate }) {
  const containerRef = useRef(null);
  const [canvasWidth] = useState(700);
  const canvasHeight = 400;
  const [dragState, setDragState] = useState(null); // { id, valid }

  // Calculate scale to fit sheet in canvas
  const scale = useMemo(() => {
    const availW = canvasWidth - CANVAS_PADDING * 2;
    const availH = canvasHeight - CANVAS_PADDING * 2;
    const scaleX = availW / sheet.length;
    const scaleY = availH / sheet.width;
    return Math.min(scaleX, scaleY);
  }, [sheet.length, sheet.width, canvasWidth]);

  const sheetPixelW = sheet.length * scale;
  const sheetPixelH = sheet.width * scale;
  const offsetX = (canvasWidth - sheetPixelW) / 2;
  const offsetY = (canvasHeight - sheetPixelH) / 2;

  // Snap to grid
  const snapToGrid = (val) => Math.round(val / GRID_SIZE) * GRID_SIZE;

  // Real-time collision check during drag
  const handleDragMove = useCallback(
    (cuttingId, cuttingType, dimensions, e) => {
      const node = e.target;
      const rawX = (node.x() - offsetX) / scale;
      const rawY = (node.y() - offsetY) / scale;
      const snappedX = snapToGrid(rawX);
      const snappedY = snapToGrid(rawY);

      const dims = typeof dimensions === "string" ? JSON.parse(dimensions) : dimensions;

      // Get center for AABB from top-left position
      const { centerX, centerY } = getCenterFromTopLeft(cuttingType, dims, snappedX, snappedY);

      // Validate against other cuttings (exclude self)
      const otherCuttings = cuttings.filter((c) => c.id !== cuttingId);
      const result = validatePlacement(
        sheet,
        otherCuttings,
        { cuttingType, dimensions: dims, positionX: snappedX, positionY: snappedY, rotation: 0 }
      );

      setDragState({ id: cuttingId, valid: result.valid });
    },
    [cuttings, sheet, offsetX, offsetY, scale]
  );

  // Handle drag end for a cutting shape
  const handleDragEnd = useCallback(
    (cuttingId, cuttingType, dimensions, e) => {
      const node = e.target;
      const newX = snapToGrid((node.x() - offsetX) / scale);
      const newY = snapToGrid((node.y() - offsetY) / scale);

      const dims = typeof dimensions === "string" ? JSON.parse(dimensions) : dimensions;

      // Final validation
      const otherCuttings = cuttings.filter((c) => c.id !== cuttingId);
      const result = validatePlacement(
        sheet,
        otherCuttings,
        { cuttingType, dimensions: dims, positionX: newX, positionY: newY, rotation: 0 }
      );

      setDragState(null);

      if (result.valid && onPositionUpdate) {
        onPositionUpdate(cuttingId, { positionX: newX, positionY: newY });
      }
      // If invalid, node snaps back on next re-render (server state)
    },
    [cuttings, sheet, offsetX, offsetY, scale, onPositionUpdate]
  );

  // Render grid lines
  const gridLines = useMemo(() => {
    const lines = [];
    const gridPx = GRID_SIZE * scale;
    if (gridPx < 4) return lines; // Skip grid if too dense

    for (let x = 0; x <= sheetPixelW; x += gridPx) {
      lines.push(
        <Line
          key={`v-${x}`}
          points={[offsetX + x, offsetY, offsetX + x, offsetY + sheetPixelH]}
          stroke="#334155"
          strokeWidth={0.5}
          opacity={0.3}
        />
      );
    }
    for (let y = 0; y <= sheetPixelH; y += gridPx) {
      lines.push(
        <Line
          key={`h-${y}`}
          points={[offsetX, offsetY + y, offsetX + sheetPixelW, offsetY + y]}
          stroke="#334155"
          strokeWidth={0.5}
          opacity={0.3}
        />
      );
    }
    return lines;
  }, [sheetPixelW, sheetPixelH, offsetX, offsetY, scale]);

  return (
    <div ref={containerRef} className="bg-bg-base rounded-lg overflow-hidden border border-border/50">
      <Stage width={canvasWidth} height={canvasHeight}>
        {/* Background + Grid */}
        <Layer listening={false}>
          {/* Canvas background */}
          <Rect x={0} y={0} width={canvasWidth} height={canvasHeight} fill="#0f172a" />

          {/* Sheet surface */}
          <Rect
            x={offsetX}
            y={offsetY}
            width={sheetPixelW}
            height={sheetPixelH}
            fill="#1e293b"
            stroke="#475569"
            strokeWidth={2}
            cornerRadius={2}
          />
          {gridLines}

          {/* Dimension labels */}
          <Text
            x={offsetX + sheetPixelW / 2 - 25}
            y={offsetY + sheetPixelH + 10}
            text={`${sheet.length} mm`}
            fill="#64748b"
            fontSize={11}
            fontFamily="Inter, sans-serif"
            align="center"
          />
          <Text
            x={offsetX - 35}
            y={offsetY + sheetPixelH / 2 + 15}
            text={`${sheet.width} mm`}
            fill="#64748b"
            fontSize={11}
            fontFamily="Inter, sans-serif"
            rotation={-90}
          />

          {/* Kerf indicator */}
          <Text
            x={offsetX}
            y={offsetY - 18}
            text={`Kerf: ${sheet.kerfAllowance} mm`}
            fill="#475569"
            fontSize={10}
            fontFamily="Inter, sans-serif"
          />
        </Layer>

        {/* Cutting Shapes */}
        <Layer>
          {cuttings.map((cut) => {
            const isBeingDragged = dragState?.id === cut.id;
            const isDragInvalid = isBeingDragged && !dragState.valid;

            return (
              <CuttingShapeKonva
                key={cut.id}
                cutting={cut}
                scale={scale}
                offsetX={offsetX}
                offsetY={offsetY}
                isInvalid={isDragInvalid}
                onDragMove={(e) =>
                  handleDragMove(cut.id, cut.cuttingType, cut.dimensions, e)
                }
                onDragEnd={(e) =>
                  handleDragEnd(cut.id, cut.cuttingType, cut.dimensions, e)
                }
              />
            );
          })}
        </Layer>
      </Stage>

      {/* Canvas status bar */}
      <div className="flex items-center justify-between px-3 py-1.5 text-xs text-text-muted border-t border-border/50 bg-bg-surface/50">
        <span>{cuttings.length} cut(s) placed</span>
        <span>Grid: {GRID_SIZE}mm snap</span>
        {dragState && (
          <span className={dragState.valid ? "text-success" : "text-danger font-medium"}>
            {dragState.valid ? "✓ Valid position" : "✗ Invalid — collision detected"}
          </span>
        )}
      </div>
    </div>
  );
}

// Individual cutting shape renderer
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
            cornerRadius={1}
            shadowColor={isInvalid ? "#ef4444" : colors.stroke}
            shadowBlur={isInvalid ? 8 : 3}
            shadowOpacity={0.3}
          />
          <Text
            x={4}
            y={4}
            text={jobNumber || `${dims.length}×${dims.width}`}
            fill="white"
            fontSize={Math.max(9, Math.min(12, dims.length * scale * 0.1))}
            fontFamily="Inter, sans-serif"
            fontStyle="bold"
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
            shadowColor={isInvalid ? "#ef4444" : colors.stroke}
            shadowBlur={isInvalid ? 8 : 3}
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
            shadowColor={isInvalid ? "#ef4444" : colors.stroke}
            shadowBlur={isInvalid ? 8 : 3}
            shadowOpacity={0.3}
          />
          <Text
            x={4}
            y={dims.height * scale - 16}
            text={jobNumber || `${dims.base}×${dims.height}`}
            fill="white"
            fontSize={10}
            fontFamily="Inter, sans-serif"
            fontStyle="bold"
          />
        </Group>
      );

    default:
      return null;
  }
}
