import type { AssetCategory } from '../types';

// City canvas. Scale: 1 cell = 10 × 10 m = 100 m².
// Streets are defined explicitly below — only cells inside a street render
// as asphalt and get lane markings. Everything else is empty terrain.

export const TILE_W = 64;
export const TILE_H = 32;

export interface Plot {
  gx: number;
  gy: number;
  size: 1 | 2 | 3 | 4;
}

export interface Street {
  axis: 'horizontal' | 'vertical';
  // Position of the street's low edge (in cells). For a 2-cell wide avenue at
  // position 5, the street occupies cells at [5, 6] on the perpendicular axis.
  position: number;
  // Width in cells (× 10 m). 1 = narrow residential 10 m, 2 = 20 m avenue,
  // 3+ = 30 m+ boulevard.
  width: number;
  // Extent along the axis (inclusive, in cells).
  start: number;
  end: number;
}

// Ellie's plot — unchanged.
export const ELLIE_PLOT: Plot = { gx: -2, gy: -2, size: 3 };

export const PLOTS: Plot[] = [ELLIE_PLOT];
export const BUYABLE_PLOTS: Plot[] = [];
export const MAX_PLOTS = 0;
export const EMPTY_PLOT_CELLS: Array<[number, number]> = [];

// Canvas extent.
const EXTENT = 20;
export const X_MIN = -EXTENT;
export const Y_MIN = -EXTENT;
export const X_MAX = EXTENT;
export const Y_MAX = EXTENT;

export const ELLIE_GX = ELLIE_PLOT.gx;
export const ELLIE_GY = ELLIE_PLOT.gy;

export function iso(x: number, y: number) {
  return { x: (x - y) * (TILE_W / 2), y: (x + y) * (TILE_H / 2) };
}

// ─── Streets ────────────────────────────────────────────────────────────────
// Right now: one 20 m east–west avenue a few cells south of Ellie's plot.
export const STREETS_DEF: Street[] = [
  { axis: 'horizontal', position: 5, width: 2, start: X_MIN, end: X_MAX },
];

// Cell occupancy sets.
const PLOT_CELLS = new Set<string>();
for (const p of PLOTS) {
  for (let dx = 0; dx < p.size; dx++) {
    for (let dy = 0; dy < p.size; dy++) {
      PLOT_CELLS.add(`${p.gx + dx},${p.gy + dy}`);
    }
  }
}
const STREET_CELLS = new Set<string>();
for (const s of STREETS_DEF) {
  if (s.axis === 'horizontal') {
    for (let x = s.start; x <= s.end; x++) {
      for (let dy = 0; dy < s.width; dy++) {
        STREET_CELLS.add(`${x},${s.position + dy}`);
      }
    }
  } else {
    for (let y = s.start; y <= s.end; y++) {
      for (let dx = 0; dx < s.width; dx++) {
        STREET_CELLS.add(`${s.position + dx},${y}`);
      }
    }
  }
}

export function isPlotCell(gx: number, gy: number) {
  return PLOT_CELLS.has(`${gx},${gy}`);
}
export function isStreetCell(gx: number, gy: number) {
  return STREET_CELLS.has(`${gx},${gy}`);
}
// Legacy name — kept so existing imports still compile. "Street" here means
// "not a plot cell"; use isStreetCell for the paved-asphalt check.
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

// Lane marking axes derived from STREETS_DEF: list of row/column indices that
// the StreetMarkings component can group into bands.
export const STREETS_Y: number[] = (() => {
  const ys = new Set<number>();
  for (const s of STREETS_DEF) {
    if (s.axis === 'horizontal') {
      for (let dy = 0; dy < s.width; dy++) ys.add(s.position + dy);
    }
  }
  return [...ys].sort((a, b) => a - b);
})();
export const STREETS_X: number[] = (() => {
  const xs = new Set<number>();
  for (const s of STREETS_DEF) {
    if (s.axis === 'vertical') {
      for (let dx = 0; dx < s.width; dx++) xs.add(s.position + dx);
    }
  }
  return [...xs].sort((a, b) => a - b);
})();
export const STREETS = [-6, 0, 6]; // kept for TrafficSim stop-line math

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
