import type { AssetCategory } from '../types';

// Blank canvas. The city has no streets and no buyable plots — only Ellie's
// house. Rebuild from here.

export const TILE_W = 64;
export const TILE_H = 32;

export interface Plot {
  gx: number;
  gy: number;
  size: 1 | 2 | 3 | 4;
}

// Only Ellie's plot exists for now.
export const ELLIE_PLOT: Plot = { gx: -2, gy: -2, size: 3 };

export const PLOTS: Plot[] = [ELLIE_PLOT];
export const BUYABLE_PLOTS: Plot[] = [];
export const MAX_PLOTS = 0;
export const EMPTY_PLOT_CELLS: Array<[number, number]> = [];

// Keep the canvas small enough to be navigable until streets/plots are added.
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

// No streets yet. Keep arrays empty so the Scene draws no lane markings.
export const STREETS_X: number[] = [];
export const STREETS_Y: number[] = [];
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
