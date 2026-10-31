import type { AssetCategory } from '../types';

// City layout — real-city feel: avenues separate districts, each district is
// a dense tile of plots of a single size.
//
//  Suburb (1×1 lots)
//  ┌──────────────────────────────────────┐
//  │   Mid-rise ring (2×2 lots)           │
//  │   ┌──────────────────────────────┐   │
//  │   │   Downtown (3×3, 4×4 lots)    │   │
//  │   │          + Ellie's 3×3        │   │
//  │   └──────────────────────────────┘   │
//  └──────────────────────────────────────┘
//
// All plots have at least a 2-cell street between them.

export const TILE_W = 64;
export const TILE_H = 32;

export interface Plot {
  gx: number;
  gy: number;
  size: 1 | 2 | 3 | 4;
}

interface Rect {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

function overlapsAny(x: number, y: number, size: number, rects: Rect[]): boolean {
  for (const r of rects) {
    if (
      x <= r.xMax &&
      x + size - 1 >= r.xMin &&
      y <= r.yMax &&
      y + size - 1 >= r.yMin
    ) return true;
  }
  return false;
}

// Fill a rectangular region with a grid of plots of fixed size and gap,
// skipping any plot that would overlap an excluded rectangle.
function tile(
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  size: 1 | 2 | 3 | 4,
  gap: number,
  exclude: Rect[],
): Plot[] {
  const step = size + gap;
  const out: Plot[] = [];
  for (let x = xMin; x + size - 1 <= xMax; x += step) {
    for (let y = yMin; y + size - 1 <= yMax; y += step) {
      if (!overlapsAny(x, y, size, exclude)) out.push({ gx: x, gy: y, size });
    }
  }
  return out;
}

// ─── Downtown core ───────────────────────────────────────────────────────────
// Four 4×4 landmark lots at the corners of the core, four 3×3 skyscraper lots
// filling the cardinals, Ellie's 3×3 plot dead-center.
const DOWNTOWN_PLOTS: Plot[] = [
  { gx: -10, gy: -10, size: 4 },
  { gx:   4, gy: -10, size: 4 },
  { gx: -10, gy:   4, size: 4 },
  { gx:   4, gy:   4, size: 4 },
  { gx:  -3, gy: -10, size: 3 },
  { gx:  -3, gy:   4, size: 3 },
  { gx: -10, gy:  -3, size: 3 },
  { gx:   4, gy:  -3, size: 3 },
];
export const ELLIE_PLOT: Plot = { gx: -2, gy: -2, size: 3 };

// 1-cell buffer around downtown so mid-rise plots don't butt up against the
// landmark lots.
const DOWNTOWN_RECT: Rect = { xMin: -11, xMax: 8, yMin: -11, yMax: 8 };

// ─── Mid-rise ring ───────────────────────────────────────────────────────────
// Full tile of 2×2 lots over a 42×42 belt around downtown. Downtown is
// subtracted so the frame fills in the corners instead of leaving dead corners.
const MID_RING: Plot[] = tile(-22, 19, -22, 19, 2, 2, [DOWNTOWN_RECT]);

// ─── Suburban ring ───────────────────────────────────────────────────────────
// Full tile of 1×1 lots in an outer frame. Mid-rise area is subtracted so
// 1×1 plots only appear in the outer belt beyond the mid-rise ring.
const MID_RECT: Rect = { xMin: -23, xMax: 20, yMin: -23, yMax: 20 };
const SUBURB: Plot[] = tile(-30, 27, -30, 27, 1, 2, [DOWNTOWN_RECT, MID_RECT]);

export const PLOTS: Plot[] = [ELLIE_PLOT, ...DOWNTOWN_PLOTS, ...MID_RING, ...SUBURB];

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

// Backward-compat alias.
export const EMPTY_PLOT_CELLS: Array<[number, number]> = BUYABLE_PLOTS.map((p) => [p.gx, p.gy]);

// ─── Grid bounds ─────────────────────────────────────────────────────────────
const MARGIN = 3;
export const X_MIN = Math.min(...PLOTS.map((p) => p.gx)) - MARGIN;
export const Y_MIN = Math.min(...PLOTS.map((p) => p.gy)) - MARGIN;
export const X_MAX = Math.max(...PLOTS.map((p) => p.gx + p.size - 1)) + MARGIN;
export const Y_MAX = Math.max(...PLOTS.map((p) => p.gy + p.size - 1)) + MARGIN;

export const ELLIE_GX = ELLIE_PLOT.gx;
export const ELLIE_GY = ELLIE_PLOT.gy;

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
// stripe; every x that is entirely street gets a vertical stripe.
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
