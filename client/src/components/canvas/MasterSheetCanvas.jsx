// ============================================================
// PHH Inventory — Master Sheet Canvas (react-konva)
// ============================================================

import { useState, useRef, useMemo } from "react";
import { Stage, Layer, Rect, Circle, Line, Text, Group } from "react-konva";

const CANVAS_PADDING = 40;
const GRID_SIZE = 10; // mm

// Shape colors
const SHAPE_COLORS = {
  rectangle: { fill: "#3b82f680", stroke: "#3b82f6" },
  circle: { fill: "#8b5cf680", stroke: "#8b5cf6" },
  triangle: { fill: "#f59e0b80", stroke: "#f59e0b" },
};

export default function MasterSheetCanvas({ sheet, cuttings, onPositionUpdate }) {
  const containerRef = useRef(null);
  const [canvasWidth, setCanvasWidth] = useState(700);
  const canvasHeight = 400;

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

  // Handle drag end for a cutting shape
  const handleDragEnd = (cuttingId, e) => {
    const node = e.target;
    // Convert pixel position back to mm
    const newX = snapToGrid((node.x() - offsetX) / scale);
    const newY = snapToGrid((node.y() - offsetY) / scale);

    if (onPositionUpdate) {
      onPositionUpdate(cuttingId, { positionX: newX, positionY: newY });
    }
  };

  // Render grid lines
  const gridLines = useMemo(() => {
    const lines = [];
    const gridPx = GRID_SIZE * scale;
    if (gridPx < 4) return lines; // Skip grid if too dense

    // Vertical
    for (let x = 0; x <= sheetPixelW; x += gridPx) {
      lines.push(
        <Line
          key={`v-${x}`}
          points={[offsetX + x, offsetY, offsetX + x, offsetY + sheetPixelH]}
          stroke="#334155"
          strokeWidth={0.5}
          opacity={0.4}
        />
      );
    }
    // Horizontal
    for (let y = 0; y <= sheetPixelH; y += gridPx) {
      lines.push(
        <Line
          key={`h-${y}`}
          points={[offsetX, offsetY + y, offsetX + sheetPixelW, offsetY + y]}
          stroke="#334155"
          strokeWidth={0.5}
          opacity={0.4}
        />
      );
    }
    return lines;
  }, [sheetPixelW, sheetPixelH, offsetX, offsetY, scale]);

  return (
    <div ref={containerRef} className="bg-bg-base rounded-lg overflow-hidden">
      <Stage width={canvasWidth} height={canvasHeight}>
        {/* Grid Layer */}
        <Layer listening={false}>
          {/* Sheet background */}
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
            x={offsetX}
            y={offsetY + sheetPixelH + 8}
            text={`${sheet.length} mm`}
            fill="#94a3b8"
            fontSize={11}
            fontFamily="Inter"
          />
          <Text
            x={offsetX - 30}
            y={offsetY + sheetPixelH / 2}
            text={`${sheet.width} mm`}
            fill="#94a3b8"
            fontSize={11}
            fontFamily="Inter"
            rotation={-90}
          />
        </Layer>

        {/* Cutting Shapes Layer */}
        <Layer>
          {cuttings.map((cut) => (
            <CuttingShapeKonva
              key={cut.id}
              cutting={cut}
              scale={scale}
              offsetX={offsetX}
              offsetY={offsetY}
              onDragEnd={(e) => handleDragEnd(cut.id, e)}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}

// Individual cutting shape renderer
function CuttingShapeKonva({ cutting, scale, offsetX, offsetY, onDragEnd }) {
  const { cuttingType, dimensions, positionX, positionY } = cutting;
  const colors = SHAPE_COLORS[cuttingType] || SHAPE_COLORS.rectangle;
  const dims = typeof dimensions === 'string' ? JSON.parse(dimensions) : dimensions;

  const pixelX = offsetX + positionX * scale;
  const pixelY = offsetY + positionY * scale;

  const commonProps = {
    x: pixelX,
    y: pixelY,
    draggable: true,
    onDragEnd,
    onMouseEnter: (e) => {
      e.target.getStage().container().style.cursor = "grab";
    },
    onMouseLeave: (e) => {
      e.target.getStage().container().style.cursor = "default";
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
            strokeWidth={1.5}
            cornerRadius={1}
          />
          <Text
            x={4}
            y={4}
            text={`${dims.length}×${dims.width}`}
            fill="white"
            fontSize={10}
            fontFamily="Inter"
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
            strokeWidth={1.5}
          />
          <Text
            x={-15}
            y={-6}
            text={`r=${dims.radius}`}
            fill="white"
            fontSize={10}
            fontFamily="Inter"
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
            strokeWidth={1.5}
          />
          <Text
            x={4}
            y={dims.height * scale - 14}
            text={`${dims.base}×${dims.height}`}
            fill="white"
            fontSize={10}
            fontFamily="Inter"
          />
        </Group>
      );

    default:
      return null;
  }
}
