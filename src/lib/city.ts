import type { AssetCategory } from '../types';

// Street layout. One "street" is BLOCK_COUNT identical blocks lined up along the +x axis.
// Each block is an 11×11 isometric grid with internal cross-streets at local x/y = -3, 0, 3,
// subdivided into 16 2×2 cell blocks. Ellie's home sits in block 0 (plot cell (1, 1) is hers,
// so her block contributes 15 plots; every other block contributes 16).

export const BLOCK_SIZE = 11;        // cells per axis per block
export const BLOCK_OFFSET = 14;      // cells between block centers along each axis
export const BLOCK_COUNT_X = 3;
export const BLOCK_COUNT_Y = 3;
// Legacy alias (some callers import BLOCK_COUNT); kept pointing at the x-axis count.
export const BLOCK_COUNT = BLOCK_COUNT_X;
export const BLOCK_OFFSET_X = BLOCK_OFFSET;

export const X_MIN = -5;
export const Y_MIN = -5;
export const X_MAX = -5 + (BLOCK_COUNT_X - 1) * BLOCK_OFFSET + 10;
export const Y_MAX = -5 + (BLOCK_COUNT_Y - 1) * BLOCK_OFFSET + 10;

export const ELLIE_GX = 1;
export const ELLIE_GY = 1;

export const TILE_W = 64;
export const TILE_H = 32;

const BASE_STREETS = [-3, 0, 3];
function expandStreets(blockCount: number): number[] {
  const all: number[] = [];
  for (let b = 0; b < blockCount; b++) for (const s of BASE_STREETS) all.push(s + b * BLOCK_OFFSET);
  return all;
}
export const STREETS_X: number[] = expandStreets(BLOCK_COUNT_X);
export const STREETS_Y: number[] = expandStreets(BLOCK_COUNT_Y);
// Backward-compat alias for traffic sim (uses only block-0 streets for lights/vehicles).
export const STREETS = BASE_STREETS;

export function iso(x: number, y: number) {
  return { x: (x - y) * (TILE_W / 2), y: (x + y) * (TILE_H / 2) };
}

export function isStreet(gx: number, gy: number) {
  return STREETS_X.includes(gx) || STREETS_Y.includes(gy);
}

export function isEllieCell(gx: number, gy: number) {
  return gx === ELLIE_GX && gy === ELLIE_GY;
}

function blockRange(bx: number): [number, number] {
  const starts = [-5, -2, 1, 4];
  return [starts[bx], starts[bx] + 1];
}

// All plot cells across every block: 15 in Ellie's block (block 0,0), 16 in every other block.
export const EMPTY_PLOT_CELLS: Array<[number, number]> = (() => {
  const plots: Array<[number, number]> = [];
  for (let bbx = 0; bbx < BLOCK_COUNT_X; bbx++) {
    for (let bby = 0; bby < BLOCK_COUNT_Y; bby++) {
      const offsetX = bbx * BLOCK_OFFSET;
      const offsetY = bby * BLOCK_OFFSET;
      for (let bx = 0; bx < 4; bx++) {
        for (let by = 0; by < 4; by++) {
          const [gxMin] = blockRange(bx);
          const [gyMin] = blockRange(by);
          if (bbx === 0 && bby === 0 && isEllieCell(gxMin, gyMin)) continue;
          plots.push([gxMin + offsetX, gyMin + offsetY]);
        }
      }
    }
  }
  // Sort by distance from Ellie so first-time purchases ripple outward across the street.
  plots.sort((a, b) => {
    const da = Math.abs(a[0] - ELLIE_GX) + Math.abs(a[1] - ELLIE_GY);
    const db = Math.abs(b[0] - ELLIE_GX) + Math.abs(b[1] - ELLIE_GY);
    if (da !== db) return da - db;
    const aAng = Math.atan2(a[1] - ELLIE_GY, a[0] - ELLIE_GX);
    const bAng = Math.atan2(b[1] - ELLIE_GY, b[0] - ELLIE_GX);
    return aAng - bAng;
  });
  return plots;
})();

export const MAX_PLOTS = EMPTY_PLOT_CELLS.length;

// Backward-compat: some callers import GRID.
export const GRID = 5;

export type Ambient = { category: AssetCategory; color: string; scale: number } | null;

// Non-plot, non-street, non-Ellie cells are left empty — the only houses on the land are
// Ellie's and the player's purchased ones.
export function ambientAt(_gx: number, _gy: number): Ambient {
  return null;
}
