// ============================================================
// PHH Inventory — Geometry unit tests (shared single source of truth)
// ============================================================

import { describe, it, expect } from "vitest";
import {
  calculateCutArea,
  calculatePerimeter,
  calculateEffectiveArea,
  getBoundingBox,
  checkOverlap,
  checkWithinSheet,
  getCenterFromTopLeft,
  validatePlacement,
} from "./geometry.js";

describe("calculateCutArea", () => {
  it("rectangle = length * width", () => {
    expect(calculateCutArea("rectangle", { length: 100, width: 50 } as any)).toBe(5000);
  });
  it("circle = π r²", () => {
    expect(calculateCutArea("circle", { radius: 10 } as any)).toBeCloseTo(Math.PI * 100, 6);
  });
  it("triangle = 0.5 * base * height", () => {
    expect(calculateCutArea("triangle", { base: 20, height: 10 } as any)).toBe(100);
  });
  it("unknown type → 0", () => {
    expect(calculateCutArea("hexagon", {} as any)).toBe(0);
  });
  it("malformed dimensions → 0 (no NaN)", () => {
    expect(calculateCutArea("rectangle", {} as any)).toBe(0);
  });
});

describe("calculatePerimeter", () => {
  it("rectangle = 2(l+w)", () => {
    expect(calculatePerimeter("rectangle", { length: 100, width: 50 } as any)).toBe(300);
  });
  it("circle = 2πr", () => {
    expect(calculatePerimeter("circle", { radius: 10 } as any)).toBeCloseTo(2 * Math.PI * 10, 6);
  });
  it("triangle (isosceles approximation)", () => {
    // base 20, height 10 -> sides = sqrt(10^2 + 10^2) = 14.142..., perim = 20 + 2*14.142
    expect(calculatePerimeter("triangle", { base: 20, height: 10 } as any)).toBeCloseTo(
      20 + 2 * Math.sqrt(200),
      6
    );
  });
});

describe("calculateEffectiveArea", () => {
  it("adds perimeter * kerf to cut area", () => {
    // rect 100x50: area 5000, perim 300, kerf 2 -> 5000 + 600 = 5600
    expect(calculateEffectiveArea("rectangle", { length: 100, width: 50 } as any, 2)).toBe(5600);
  });
  it("kerf 0 returns cut area", () => {
    expect(calculateEffectiveArea("rectangle", { length: 10, width: 10 } as any, 0)).toBe(100);
  });
});

describe("getBoundingBox", () => {
  it("axis-aligned rectangle about its center", () => {
    const bb = getBoundingBox("rectangle", { length: 100, width: 40 } as any, 50, 20, 0, 0);
    expect(bb).toEqual({ x1: 0, y1: 0, x2: 100, y2: 40 });
  });
  it("90° rotation swaps the extents", () => {
    const bb = getBoundingBox("rectangle", { length: 100, width: 40 } as any, 0, 0, 90, 0);
    expect(bb.x2 - bb.x1).toBeCloseTo(40, 6);
    expect(bb.y2 - bb.y1).toBeCloseTo(100, 6);
  });
  it("circle is rotation-invariant", () => {
    const bb = getBoundingBox("circle", { radius: 10 } as any, 20, 20, 45, 0);
    expect(bb).toEqual({ x1: 10, y1: 10, x2: 30, y2: 30 });
  });
  it("kerf margin expands by kerf/2 per side", () => {
    const bb = getBoundingBox("rectangle", { length: 100, width: 40 } as any, 50, 20, 0, 4);
    expect(bb).toEqual({ x1: -2, y1: -2, x2: 102, y2: 42 });
  });
});

describe("checkOverlap", () => {
  const a = { x1: 0, y1: 0, x2: 10, y2: 10 };
  it("detects overlap", () => {
    expect(checkOverlap(a, { x1: 5, y1: 5, x2: 15, y2: 15 })).toBe(true);
  });
  it("no overlap when separated", () => {
    expect(checkOverlap(a, { x1: 20, y1: 0, x2: 30, y2: 10 })).toBe(false);
  });
  it("edge-touching is not an overlap", () => {
    expect(checkOverlap(a, { x1: 10, y1: 0, x2: 20, y2: 10 })).toBe(false);
  });
});

describe("checkWithinSheet", () => {
  it("inside", () => {
    expect(checkWithinSheet({ x1: 0, y1: 0, x2: 50, y2: 50 }, 100, 100)).toBe(true);
  });
  it("exceeding right/bottom edge", () => {
    expect(checkWithinSheet({ x1: 0, y1: 0, x2: 120, y2: 50 }, 100, 100)).toBe(false);
  });
  it("negative origin", () => {
    expect(checkWithinSheet({ x1: -1, y1: 0, x2: 50, y2: 50 }, 100, 100)).toBe(false);
  });
});

describe("getCenterFromTopLeft", () => {
  it("rectangle offsets by half extents", () => {
    expect(getCenterFromTopLeft("rectangle", { length: 100, width: 40 }, 0, 0)).toEqual({
      centerX: 50,
      centerY: 20,
    });
  });
  it("circle position IS the center", () => {
    expect(getCenterFromTopLeft("circle", { radius: 10 }, 25, 25)).toEqual({
      centerX: 25,
      centerY: 25,
    });
  });
});

describe("validatePlacement", () => {
  const sheetL = 1000;
  const sheetW = 500;
  const kerf = 2;

  it("accepts a valid in-bounds placement", () => {
    const result = validatePlacement(sheetL, sheetW, kerf, [], {
      cuttingType: "rectangle",
      dimensions: { length: 100, width: 50 } as any,
      positionX: 100,
      positionY: 100,
      rotation: 0,
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects a placement outside the sheet", () => {
    const result = validatePlacement(sheetL, sheetW, kerf, [], {
      cuttingType: "rectangle",
      dimensions: { length: 100, width: 50 } as any,
      positionX: 980,
      positionY: 100,
      rotation: 0,
    });
    expect(result.valid).toBe(false);
  });

  it("rejects an overlapping placement (with kerf gap)", () => {
    const existing = [
      {
        cuttingType: "rectangle",
        dimensions: { length: 100, width: 100 } as any,
        positionX: 100,
        positionY: 100,
        rotation: 0,
      },
    ];
    const result = validatePlacement(sheetL, sheetW, kerf, existing, {
      cuttingType: "rectangle",
      dimensions: { length: 100, width: 100 } as any,
      positionX: 150, // overlaps the existing one
      positionY: 150,
      rotation: 0,
    });
    expect(result.valid).toBe(false);
  });

  it("a circle at center (0,0) is rejected (extends to negative)", () => {
    const result = validatePlacement(sheetL, sheetW, kerf, [], {
      cuttingType: "circle",
      dimensions: { radius: 20 } as any,
      positionX: 0,
      positionY: 0,
      rotation: 0,
    });
    expect(result.valid).toBe(false);
  });

  it("a circle centered at (radius, radius) fits", () => {
    const result = validatePlacement(sheetL, sheetW, 0, [], {
      cuttingType: "circle",
      dimensions: { radius: 20 } as any,
      positionX: 20,
      positionY: 20,
      rotation: 0,
    });
    expect(result.valid).toBe(true);
  });
});
