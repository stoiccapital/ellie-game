import type { AssetCategory } from '../types';

// City layout, designed for mixed lot sizes (1-4 cells per side).
//
// A plot is an N×N square of cells anchored at (gx, gy) and extending to
// (gx + N - 1, gy + N - 1). Between adjacent plots we keep at least a 2-cell
// street buffer so even 4×4 landmark lots breathe. Streets are inferred from
// the gaps between plot rectangles (any non-plot cell is street).
//
// Buildings can only be built on plots whose size ≥ the building's footprint,
// enforced in the redevelop/buy flows.

export const TILE_W = 64;
export const TILE_H = 32;

export interface Plot {
  gx: number;
  gy: number;
  size: 1 | 2 | 3 | 4;
}

// Lay out a rectangular ring of plots of a given size, with `gap` cells of
// street between them. Returns the resulting plots.
function row(startX: number, y: number, size: 1 | 2 | 3 | 4, count: number, gap: number): Plot[] {
  const step = size + gap;
  const out: Plot[] = [];
  for (let i = 0; i < count; i++) out.push({ gx: startX + i * step, gy: y, size });
  return out;
}

function grid(
  startX: number,
  startY: number,
  size: 1 | 2 | 3 | 4,
  cols: number,
  rows: number,
  gap: number,
): Plot[] {
  const step = size + gap;
  const out: Plot[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      out.push({ gx: startX + c * step, gy: startY + r * step, size });
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// City composition.
//
// Zones, roughly centered on Ellie's house at the middle:
//   Downtown core    — 4×4 landmark lots + 3×3 skyscraper lots
//   Mid-rise ring    — 2×2 lots for family houses, mid-rise, hotels, shops
//   Suburban fringe  — 1×1 lots for studios, cafes, small retail
// ─────────────────────────────────────────────────────────────────────────────

const GAP = 2; // 2-cell street between adjacent plots

const DOWNTOWN: Plot[] = [
  // Four 4×4 landmark lots clockwise around the center
  { gx: -10, gy: -10, size: 4 },
  { gx:   4, gy: -10, size: 4 },
  { gx: -10, gy:   4, size: 4 },
  { gx:   4, gy:   4, size: 4 },
  // 3×3 skyscraper lots filling the cardinal gaps
  { gx: -3, gy: -10, size: 3 },
  { gx: -3, gy:   4, size: 3 },
  { gx: -10, gy: -3, size: 3 },
  { gx:   4, gy: -3, size: 3 },
];

// Ellie's house sits in the middle 3×3 between the four landmark lots.
export const ELLIE_PLOT: Plot = { gx: -2, gy: -2, size: 3 };

// Mid-rise ring — 2×2 lots fanning out from downtown, forming a square frame.
const MID_RING: Plot[] = [
  // Top row (above downtown)
  ...row(-24, -18, 2, 10, GAP),
  // Bottom row (below downtown)
  ...row(-24, 14, 2, 10, GAP),
  // Left column (minus the corners which the top/bottom rows own)
  ...grid(-24, -12, 2, 1, 6, GAP),
  // Right column
  ...grid(16, -12, 2, 1, 6, GAP),
];

// Suburban fringe — 1×1 lots on the far outer edge.
const SUBURB: Plot[] = [
  // Top edge
  ...row(-30, -26, 1, 20, GAP),
  // Bottom edge
  ...row(-30,  26, 1, 20, GAP),
  // Left and right edges
  ...grid(-30, -22, 1, 1, 15, GAP),
  ...grid( 29, -22, 1, 1, 15, GAP),
];

export const PLOTS: Plot[] = [ELLIE_PLOT, ...DOWNTOWN, ...MID_RING, ...SUBURB];

// Sort buyable plots (everything except Ellie's) by distance from Ellie,
// so first-time purchases happen next to her and ripple outward.
export const BUYABLE_PLOTS: Plot[] = PLOTS.filter((p) => p !== ELLIE_PLOT).sort((a, b) => {
  const da = Math.abs(a.gx - ELLIE_PLOT.gx) + Math.abs(a.gy - ELLIE_PLOT.gy);
  const db = Math.abs(b.gx - ELLIE_PLOT.gx) + Math.abs(b.gy - ELLIE_PLOT.gy);
  if (da !== db) return da - db;
  return Math.atan2(a.gy - ELLIE_PLOT.gy, a.gx - ELLIE_PLOT.gx)
       - Math.atan2(b.gy - ELLIE_PLOT.gy, b.gx - ELLIE_PLOT.gx);
});

export const MAX_PLOTS = BUYABLE_PLOTS.length;

// Backward-compat alias — Scene.tsx used to iterate [gx, gy] pairs. Keep it so
// existing consumers that treat each plot anchor as a single buy slot still
// work; new code should use BUYABLE_PLOTS to get the full {gx, gy, size}.
export const EMPTY_PLOT_CELLS: Array<[number, number]> = BUYABLE_PLOTS.map((p) => [p.gx, p.gy]);

// ─────────────────────────────────────────────────────────────────────────────
// Grid bounds — derived from the plot layout so the drawn ground always
// contains every plot plus some outer street margin.
// ─────────────────────────────────────────────────────────────────────────────

const MARGIN = 3;
export const X_MIN = Math.min(...PLOTS.map((p) => p.gx)) - MARGIN;
export const Y_MIN = Math.min(...PLOTS.map((p) => p.gy)) - MARGIN;
export const X_MAX = Math.max(...PLOTS.map((p) => p.gx + p.size - 1)) + MARGIN;
export const Y_MAX = Math.max(...PLOTS.map((p) => p.gy + p.size - 1)) + MARGIN;

// Ellie's anchor cell for Scene (back-left corner of the Ellie plot).
export const ELLIE_GX = ELLIE_PLOT.gx;
export const ELLIE_GY = ELLIE_PLOT.gy;

// Cell → iso projection.
export function iso(x: number, y: number) {
  return { x: (x - y) * (TILE_W / 2), y: (x + y) * (TILE_H / 2) };
}

// Occupancy set — every cell that belongs to a plot. All other cells are street.
const PLOT_CELLS = new Set<string>();
for (const p of PLOTS) {
  for (let dx = 0; dx < p.size; dx++) {
    for (let dy = 0; dy < p.size; dy++) {
      PLOT_CELLS.add(`${p.gx + dx},${p.gy + dy}`);
    }
  }
}

export function isPlotCell(gx: number, gy: number) {
  return PLOT_CELLS.has(`${gx},${gy}`);
}
export function isStreet(gx: number, gy: number) {
  return !PLOT_CELLS.has(`${gx},${gy}`);
}
export function isEllieCell(gx: number, gy: number) {
  return (
    gx >= ELLIE_PLOT.gx &&
    gx < ELLIE_PLOT.gx + ELLIE_PLOT.size &&
    gy >= ELLIE_PLOT.gy &&
    gy < ELLIE_PLOT.gy + ELLIE_PLOT.size
  );
}

// Derive road center lines: every y that is entirely street gets a horizontal
// road stripe; every x that is entirely street gets a vertical stripe. These
// are the actual drivable rows/columns in the new layout.
function computeFullStreetAxis(min: number, max: number, axis: 'x' | 'y'): number[] {
  const result: number[] = [];
  for (let v = min; v <= max; v++) {
    let hit = false;
    for (const p of PLOTS) {
      if (axis === 'x') {
        if (p.gx <= v && v < p.gx + p.size) { hit = true; break; }
      } else {
        if (p.gy <= v && v < p.gy + p.size) { hit = true; break; }
      }
    }
    if (!hit) result.push(v);
  }
  return result;
}
export const STREETS_X: number[] = computeFullStreetAxis(X_MIN, X_MAX, 'x');
export const STREETS_Y: number[] = computeFullStreetAxis(Y_MIN, Y_MAX, 'y');
// Backward-compat alias (used by TrafficSim for stop-line computations).
export const STREETS = [-6, 0, 6];
export const BLOCK_SIZE = 11;
export const BLOCK_COUNT = 3;
export const BLOCK_COUNT_X = 3;
export const BLOCK_COUNT_Y = 3;
export const BLOCK_OFFSET = 14;
export const BLOCK_OFFSET_X = 14;
export const GRID = 5;

export type Ambient = { category: AssetCategory; color: string; scale: number } | null;
export function ambientAt(_gx: number, _gy: number): Ambient {
  return null;
}
