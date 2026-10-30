import type { AssetCategory } from '../types';

interface Props {
  category: AssetCategory;
  color: string;
  size?: number;
  floors?: number;
  sprite?: string;
}

// Isometric SVG sprites. Centered at (0, 0), ground at y = 0.
export function AssetSprite({ category, color, size = 1, floors, sprite }: Props) {
  const s = size;
  if (sprite) {
    switch (sprite) {
      case 'shop': return <ShopSprite color={color} scale={s} />;
      case 'supermarket': return <SupermarketSprite color={color} scale={s} />;
      case 'office': return <OfficeSprite color={color} scale={s} />;
      case 'hotel': return <HotelSprite color={color} scale={s} />;
      case 'school': return <SchoolSprite color={color} scale={s} />;
      case 'clinic': return <ClinicSprite color={color} scale={s} />;
      case 'hospital': return <HospitalSprite color={color} scale={s} />;
      case 'gym': return <GymSprite color={color} scale={s} />;
      case 'cinema': return <CinemaSprite color={color} scale={s} />;
    }
  }
  switch (category) {
    case 'real_estate':
      return <HouseSprite color={color} scale={s} />;
    case 'commercial':
      return <CommercialSprite color={color} scale={s} />;
    case 'land':
      return <LandSprite color={color} scale={s} />;
    case 'vehicle':
      return <VehicleSprite color={color} scale={s} />;
    case 'tower':
      return <TowerSprite color={color} scale={s} floors={floors ?? 10} />;
  }
}

function shade(hex: string, amount: number) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const adj = (c: number) => Math.max(0, Math.min(255, Math.round(c + 255 * amount)));
  return `rgb(${adj(r)}, ${adj(g)}, ${adj(b)})`;
}

function HouseSprite({ color, scale }: { color: string; scale: number }) {
  const bw = 28 * scale;
  const bd = 14 * scale;
  const h = 26 * scale;
  const roof = 14 * scale;
  const west = shade(color, -0.18);
  const east = shade(color, -0.08);
  const roofColor = '#3a3f4a';
  const roofTop = shade(roofColor, 0.1);
  return (
    <g>
      {/* West wall */}
      <polygon
        points={`${-bw},${-bd} 0,${bd} 0,${bd - h} ${-bw},${-bd - h}`}
        fill={west}
      />
      {/* East wall */}
      <polygon
        points={`0,${bd} ${bw},${-bd} ${bw},${-bd - h} 0,${bd - h}`}
        fill={east}
      />
      {/* Window west */}
      <polygon
        points={`${-bw * 0.6},${-bd * 0.3 - h * 0.55} ${-bw * 0.2},${bd * 0.1 - h * 0.55} ${-bw * 0.2},${bd * 0.1 - h * 0.25} ${-bw * 0.6},${-bd * 0.3 - h * 0.25}`}
        fill="#f6e9a8"
        opacity={0.85}
      />
      {/* Window east */}
      <polygon
        points={`${bw * 0.2},${bd * 0.1 - h * 0.55} ${bw * 0.6},${-bd * 0.3 - h * 0.55} ${bw * 0.6},${-bd * 0.3 - h * 0.25} ${bw * 0.2},${bd * 0.1 - h * 0.25}`}
        fill="#f6e9a8"
        opacity={0.85}
      />
      {/* Roof: pitched */}
      <polygon
        points={`${-bw},${-bd - h} 0,${-bd * 2 - h - roof} ${bw},${-bd - h} 0,${bd - h}`}
        fill={roofTop}
      />
      <polygon
        points={`${-bw},${-bd - h} 0,${-bd * 2 - h - roof} 0,${bd - h}`}
        fill={roofColor}
      />
    </g>
  );
}

function CommercialSprite({ color, scale }: { color: string; scale: number }) {
  const bw = 34 * scale;
  const bd = 18 * scale;
  const h = 46 * scale;
  const west = shade(color, -0.18);
  const east = shade(color, -0.08);
  // Windows grid
  const rows = 3;
  const cols = 3;
  return (
    <g>
      <polygon
        points={`${-bw},${-bd} 0,${bd} 0,${bd - h} ${-bw},${-bd - h}`}
        fill={west}
      />
      <polygon
        points={`0,${bd} ${bw},${-bd} ${bw},${-bd - h} 0,${bd - h}`}
        fill={east}
      />
      {Array.from({ length: rows * cols }).map((_, i) => {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const u = (c + 1) / (cols + 1);
        const v = (r + 1) / (rows + 1);
        // west windows (flip u for west side)
        const xW = -bw + bw * u;
        const yW = -bd + bd * u - h * (1 - v) - h * 0.05;
        const xE = bw * u;
        const yE = bd - bd * u - h * (1 - v) - h * 0.05;
        return (
          <g key={i}>
            <rect x={xW - 2.5} y={yW - 3} width={5} height={5} fill="#8aa8c2" opacity={0.75} />
            <rect x={xE - 2.5} y={yE - 3} width={5} height={5} fill="#8aa8c2" opacity={0.75} />
          </g>
        );
      })}
      {/* Top */}
      <polygon
        points={`0,${-bd * 2 - h} ${-bw},${-bd - h} 0,${bd - h} ${bw},${-bd - h}`}
        fill={color}
      />
    </g>
  );
}

function LandSprite({ color: _color, scale }: { color: string; scale: number }) {
  const s = scale;
  // A patch of grass + trees
  return (
    <g>
      <polygon points={`0,${-10 * s} ${28 * s},${4 * s} 0,${18 * s} ${-28 * s},${4 * s}`} fill="#4e7a52" />
      <polygon points={`0,${-6 * s} ${22 * s},${5 * s} 0,${16 * s} ${-22 * s},${5 * s}`} fill="#5c8d60" />
      {/* trees */}
      <Tree x={-10 * s} y={-2 * s} scale={s} />
      <Tree x={8 * s} y={2 * s} scale={s} />
      <Tree x={0} y={10 * s} scale={s * 1.15} />
    </g>
  );
}

function Tree({ x, y, scale }: { x: number; y: number; scale: number }) {
  const s = scale;
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={-1.2} y={-6 * s} width={2.4} height={6 * s} fill="#5a3b22" />
      <circle cx={0} cy={-10 * s} r={6 * s} fill="#2f6b36" />
      <circle cx={-3 * s} cy={-7 * s} r={4 * s} fill="#397a3f" />
      <circle cx={3 * s} cy={-8 * s} r={4 * s} fill="#397a3f" />
    </g>
  );
}

function TowerSprite({ color, scale, floors }: { color: string; scale: number; floors: number }) {
  // Height scales with floor count. Each floor is a window row on both visible walls.
  const floorH = 3.4 * scale;
  const bw = 20 * scale;
  const bd = 10 * scale;
  const h = Math.max(26, floorH * floors);
  const west = shade(color, -0.2);
  const east = shade(color, -0.08);
  const roofColor = shade(color, 0.1);
  const cols = 4;
  const rows: React.ReactNode[] = [];
  for (let f = 0; f < floors; f++) {
    const vFrac = 0.06 + (f + 0.5) / floors * 0.9;
    for (let c = 0; c < cols; c++) {
      const uFrac = (c + 1) / (cols + 1);
      const xW = -bw + bw * uFrac;
      const yW = -bd + bd * uFrac - h * (1 - vFrac);
      const xE = bw * uFrac;
      const yE = bd - bd * uFrac - h * (1 - vFrac);
      rows.push(
        <g key={`f${f}c${c}`}>
          <rect x={xW - 1.1} y={yW - 1.1} width={2.2} height={2} fill="#8aa8c2" opacity={0.72} />
          <rect x={xE - 1.1} y={yE - 1.1} width={2.2} height={2} fill="#8aa8c2" opacity={0.72} />
        </g>,
      );
    }
  }
  return (
    <g>
      <polygon
        points={`${-bw},${-bd} 0,${bd} 0,${bd - h} ${-bw},${-bd - h}`}
        fill={west}
      />
      <polygon
        points={`0,${bd} ${bw},${-bd} ${bw},${-bd - h} 0,${bd - h}`}
        fill={east}
      />
      <polygon
        points={`0,${-bd * 2 - h} ${-bw},${-bd - h} 0,${bd - h} ${bw},${-bd - h}`}
        fill={roofColor}
      />
      {rows}
    </g>
  );
}

function VehicleSprite({ color, scale }: { color: string; scale: number }) {
  const s = scale;
  const west = shade(color, -0.2);
  const east = shade(color, -0.08);
  const top = shade(color, 0.08);
  const bw = 22 * s;
  const bd = 11 * s;
  const h = 10 * s;
  const roofBw = 14 * s;
  const roofBd = 7 * s;
  const roofH = 8 * s;
  return (
    <g>
      {/* body */}
      <polygon
        points={`${-bw},${-bd} 0,${bd} 0,${bd - h} ${-bw},${-bd - h}`}
        fill={west}
      />
      <polygon
        points={`0,${bd} ${bw},${-bd} ${bw},${-bd - h} 0,${bd - h}`}
        fill={east}
      />
      <polygon
        points={`${-bw},${-bd - h} 0,${bd - h} ${bw},${-bd - h} 0,${-bd * 2 - h}`}
        fill={color}
      />
      {/* cabin */}
      <polygon
        points={`${-roofBw},${-roofBd - h} 0,${roofBd - h} 0,${roofBd - h - roofH} ${-roofBw},${-roofBd - h - roofH}`}
        fill={shade(top, -0.15)}
      />
      <polygon
        points={`0,${roofBd - h} ${roofBw},${-roofBd - h} ${roofBw},${-roofBd - h - roofH} 0,${roofBd - h - roofH}`}
        fill={shade(top, -0.05)}
      />
      <polygon
        points={`${-roofBw},${-roofBd - h - roofH} 0,${-roofBd * 2 - h - roofH} ${roofBw},${-roofBd - h - roofH} 0,${roofBd - h - roofH}`}
        fill={top}
      />
      {/* wheels */}
      <ellipse cx={-bw * 0.55} cy={-bd * 0.35} rx={3.5} ry={2} fill="#1a1a1c" />
      <ellipse cx={bw * 0.55} cy={-bd * 0.35} rx={3.5} ry={2} fill="#1a1a1c" />
    </g>
  );
}

// ========= Themed sprite variants =============================================================
// Each shares the same iso box skeleton as HouseSprite / CommercialSprite but overlays
// identifying features (awning, red cross, marquee, flag, etc.) so the player can tell
// a café from a clinic at a glance.

function BoxBody({
  bw, bd, h, color, roofColor, roofPitched,
}: { bw: number; bd: number; h: number; color: string; roofColor?: string; roofPitched?: boolean }) {
  const west = shade(color, -0.18);
  const east = shade(color, -0.08);
  const top = roofColor ?? shade(color, 0.1);
  return (
    <g>
      <polygon points={`${-bw},${-bd} 0,${bd} 0,${bd - h} ${-bw},${-bd - h}`} fill={west} />
      <polygon points={`0,${bd} ${bw},${-bd} ${bw},${-bd - h} 0,${bd - h}`} fill={east} />
      {roofPitched ? (
        <>
          <polygon points={`${-bw},${-bd - h} 0,${-bd * 2 - h - 10} ${bw},${-bd - h} 0,${bd - h}`} fill={top} />
          <polygon points={`${-bw},${-bd - h} 0,${-bd * 2 - h - 10} 0,${bd - h}`} fill={shade(top, -0.1)} />
        </>
      ) : (
        <polygon points={`0,${-bd * 2 - h} ${-bw},${-bd - h} 0,${bd - h} ${bw},${-bd - h}`} fill={top} />
      )}
    </g>
  );
}

function ShopSprite({ color, scale }: { color: string; scale: number }) {
  // Single-story shop with striped awning + sidewalk sign + display windows.
  const s = scale;
  const bw = 26 * s;
  const bd = 13 * s;
  const h = 20 * s;
  const awning = shade(color, 0.25);
  const awningDark = shade(color, -0.05);
  const windowFill = '#f6e9a8';
  return (
    <g>
      <BoxBody bw={bw} bd={bd} h={h} color={color} />
      {/* awning stripes along the west face */}
      <polygon
        points={`${-bw * 0.95},${-bd * 0.9 - h * 0.4} ${-bw * 0.08},${bd * 0.08 - h * 0.4} ${-bw * 0.08},${bd * 0.08 - h * 0.55} ${-bw * 0.95},${-bd * 0.9 - h * 0.55}`}
        fill={awning}
      />
      <polygon
        points={`${-bw * 0.95},${-bd * 0.9 - h * 0.55} ${-bw * 0.08},${bd * 0.08 - h * 0.55} ${-bw * 0.08},${bd * 0.08 - h * 0.65} ${-bw * 0.95},${-bd * 0.9 - h * 0.65}`}
        fill={awningDark}
      />
      {/* glass storefront */}
      <polygon
        points={`${-bw * 0.75},${-bd * 0.7 - h * 0.3} ${-bw * 0.15},${bd * 0.15 - h * 0.3} ${-bw * 0.15},${bd * 0.15 - h * 0.05} ${-bw * 0.75},${-bd * 0.7 - h * 0.05}`}
        fill={windowFill}
        opacity={0.75}
      />
      {/* sidewalk A-frame sign */}
      <polygon
        points={`${-bw - 3 * s},${bd * 0.1} ${-bw},${bd * 0.1 + 4 * s} ${-bw},${bd * 0.1 - 5 * s} ${-bw - 3 * s},${bd * 0.1 - 9 * s}`}
        fill="#2b2b2e"
      />
    </g>
  );
}

function SupermarketSprite({ color, scale }: { color: string; scale: number }) {
  // Wide low building with large glass front and a horizontal signage band.
  const s = scale;
  const bw = 34 * s;
  const bd = 18 * s;
  const h = 20 * s;
  const band = shade(color, 0.3);
  return (
    <g>
      <BoxBody bw={bw} bd={bd} h={h} color={color} />
      {/* signage band */}
      <polygon
        points={`${-bw * 0.95},${-bd * 0.9 - h * 0.5} ${-bw * 0.08},${bd * 0.08 - h * 0.5} ${-bw * 0.08},${bd * 0.08 - h * 0.65} ${-bw * 0.95},${-bd * 0.9 - h * 0.65}`}
        fill={band}
      />
      {/* glass front */}
      <polygon
        points={`${-bw * 0.9},${-bd * 0.85 - h * 0.1} ${-bw * 0.1},${bd * 0.1 - h * 0.1} ${-bw * 0.1},${bd * 0.1 - h * 0.45} ${-bw * 0.9},${-bd * 0.85 - h * 0.45}`}
        fill="#aed4e4"
        opacity={0.7}
      />
      {/* cart */}
      <circle cx={-bw - 3 * s} cy={bd * 0.1 + 3 * s} r={1.2 * s} fill="#1a1a1c" />
      <circle cx={-bw - 7 * s} cy={bd * 0.1 + 3 * s} r={1.2 * s} fill="#1a1a1c" />
      <rect x={-bw - 8 * s} y={bd * 0.1 - 4 * s} width={6 * s} height={3 * s} fill="#8a9094" />
    </g>
  );
}

function OfficeSprite({ color, scale }: { color: string; scale: number }) {
  // 3-floor office with regular window grid on both visible faces.
  const s = scale;
  const bw = 22 * s;
  const bd = 11 * s;
  const h = 42 * s;
  return (
    <g>
      <BoxBody bw={bw} bd={bd} h={h} color={color} />
      {Array.from({ length: 3 }).map((_, r) =>
        Array.from({ length: 3 }).map((__, c) => {
          const u = (c + 1) / 4;
          const v = (r + 1) / 4;
          const xW = -bw + bw * u;
          const yW = -bd + bd * u - h * (1 - v);
          const xE = bw * u;
          const yE = bd - bd * u - h * (1 - v);
          return (
            <g key={`${r}_${c}`}>
              <rect x={xW - 2 * s} y={yW - 2.4 * s} width={4 * s} height={4 * s} fill="#9bb6cc" opacity={0.78} />
              <rect x={xE - 2 * s} y={yE - 2.4 * s} width={4 * s} height={4 * s} fill="#9bb6cc" opacity={0.78} />
            </g>
          );
        }),
      )}
    </g>
  );
}

function HotelSprite({ color, scale }: { color: string; scale: number }) {
  // Tall slim with a vertical neon "HOTEL" strip near the top and lit entry canopy.
  const s = scale;
  const bw = 20 * s;
  const bd = 10 * s;
  const h = 56 * s;
  return (
    <g>
      <BoxBody bw={bw} bd={bd} h={h} color={color} />
      {/* vertical sign strip on west face */}
      <polygon
        points={`${-bw * 0.55},${-bd * 0.5 - h * 0.95} ${-bw * 0.35},${-bd * 0.3 - h * 0.95} ${-bw * 0.35},${-bd * 0.3 - h * 0.25} ${-bw * 0.55},${-bd * 0.5 - h * 0.25}`}
        fill="#f2c15a"
      />
      {/* window dot grid */}
      {Array.from({ length: 10 }).map((_, r) =>
        Array.from({ length: 2 }).map((__, c) => {
          const vFrac = 0.1 + (r + 0.5) / 10 * 0.85;
          const uFrac = (c + 1) / 3;
          const xW = -bw + bw * uFrac;
          const yW = -bd + bd * uFrac - h * (1 - vFrac);
          const xE = bw * uFrac;
          const yE = bd - bd * uFrac - h * (1 - vFrac);
          return (
            <g key={`${r}_${c}`}>
              <rect x={xW - 1} y={yW - 1} width={2} height={1.8} fill="#f6e9a8" opacity={0.7} />
              <rect x={xE - 1} y={yE - 1} width={2} height={1.8} fill="#f6e9a8" opacity={0.7} />
            </g>
          );
        }),
      )}
      {/* canopy */}
      <polygon
        points={`${-bw * 1.1},${bd * 0.95} ${-bw * 0.1},${bd * 1.3} ${-bw * 0.1},${bd * 1.1} ${-bw * 1.1},${bd * 0.75}`}
        fill="#2b2b2e"
      />
    </g>
  );
}

function SchoolSprite({ color, scale }: { color: string; scale: number }) {
  // Wide low building with a bell cupola, pitched roof, and a flagpole.
  const s = scale;
  const bw = 30 * s;
  const bd = 15 * s;
  const h = 22 * s;
  return (
    <g>
      <BoxBody bw={bw} bd={bd} h={h} color={color} roofPitched />
      {/* cupola */}
      <rect x={-3 * s} y={-bd * 2 - h - 8 * s} width={6 * s} height={6 * s} fill={shade(color, 0.15)} />
      <polygon
        points={`${-4 * s},${-bd * 2 - h - 8 * s} 0,${-bd * 2 - h - 15 * s} ${4 * s},${-bd * 2 - h - 8 * s}`}
        fill="#8a4a3c"
      />
      {/* flagpole */}
      <line x1={bw * 0.9} y1={bd * 0.05} x2={bw * 0.9} y2={-bd - h - 10 * s} stroke="#c8c8c8" strokeWidth={0.8} />
      <polygon
        points={`${bw * 0.9},${-bd - h - 10 * s} ${bw * 0.9 + 7 * s},${-bd - h - 8 * s} ${bw * 0.9},${-bd - h - 6 * s}`}
        fill="#d84a3c"
      />
      {/* door */}
      <rect x={-4 * s} y={-h * 0.2} width={6 * s} height={9 * s} fill="#4a2b1c" />
    </g>
  );
}

function ClinicSprite({ color, scale }: { color: string; scale: number }) {
  // Mid-size white building with a bright red cross on each visible wall.
  const s = scale;
  const bw = 24 * s;
  const bd = 12 * s;
  const h = 28 * s;
  return (
    <g>
      <BoxBody bw={bw} bd={bd} h={h} color={color} />
      {/* red crosses */}
      <RedCross cx={-bw * 0.55} cy={-bd * 0.45 - h * 0.5} size={5 * s} skewX />
      <RedCross cx={bw * 0.55} cy={-bd * 0.45 - h * 0.5} size={5 * s} skewX={false} />
      {/* windows */}
      <rect x={-bw * 0.7} y={-bd * 0.5 - h * 0.2} width={4 * s} height={4 * s} fill="#f6e9a8" opacity={0.8} />
      <rect x={bw * 0.4} y={-bd * 0.4 - h * 0.2} width={4 * s} height={4 * s} fill="#f6e9a8" opacity={0.8} />
    </g>
  );
}

function HospitalSprite({ color, scale }: { color: string; scale: number }) {
  // Larger clinical building, giant white "H" on the roof, red cross on each wall.
  const s = scale;
  const bw = 34 * s;
  const bd = 17 * s;
  const h = 38 * s;
  return (
    <g>
      <BoxBody bw={bw} bd={bd} h={h} color={color} />
      {/* "H" on roof */}
      <g transform={`translate(0, ${-bd * 1.4 - h})`}>
        <rect x={-6 * s} y={-5 * s} width={2.6 * s} height={10 * s} fill="#f4f6f8" />
        <rect x={3.4 * s} y={-5 * s} width={2.6 * s} height={10 * s} fill="#f4f6f8" />
        <rect x={-6 * s} y={-1 * s} width={12 * s} height={2.4 * s} fill="#f4f6f8" />
      </g>
      <RedCross cx={-bw * 0.55} cy={-bd * 0.45 - h * 0.55} size={6 * s} skewX />
      <RedCross cx={bw * 0.55} cy={-bd * 0.45 - h * 0.55} size={6 * s} skewX={false} />
      {/* grid of windows */}
      {Array.from({ length: 4 }).map((_, r) =>
        Array.from({ length: 3 }).map((__, c) => {
          const u = (c + 1) / 4;
          const v = 0.15 + (r + 0.5) / 5 * 0.75;
          const xW = -bw + bw * u;
          const yW = -bd + bd * u - h * (1 - v);
          const xE = bw * u;
          const yE = bd - bd * u - h * (1 - v);
          return (
            <g key={`${r}_${c}`}>
              <rect x={xW - 1.5} y={yW - 1.7} width={3} height={3} fill="#aed4e4" opacity={0.75} />
              <rect x={xE - 1.5} y={yE - 1.7} width={3} height={3} fill="#aed4e4" opacity={0.75} />
            </g>
          );
        }),
      )}
    </g>
  );
}

function RedCross({ cx, cy, size, skewX }: { cx: number; cy: number; size: number; skewX: boolean }) {
  // Simple red cross overlay. skewX true = shears to match west iso face slope.
  const t = skewX ? 'matrix(1, 0.5, 0, 1, 0, 0)' : 'matrix(1, -0.5, 0, 1, 0, 0)';
  return (
    <g transform={`translate(${cx}, ${cy}) ${t ? '' : ''}`}>
      <g transform={t}>
        <rect x={-size * 0.9} y={-size * 0.3} width={size * 1.8} height={size * 0.6} fill="#e04a4a" />
        <rect x={-size * 0.3} y={-size * 0.9} width={size * 0.6} height={size * 1.8} fill="#e04a4a" />
      </g>
    </g>
  );
}

function GymSprite({ color, scale }: { color: string; scale: number }) {
  // Low wide building with a bold "GYM" strip on the west wall and small roof vent.
  const s = scale;
  const bw = 28 * s;
  const bd = 14 * s;
  const h = 24 * s;
  return (
    <g>
      <BoxBody bw={bw} bd={bd} h={h} color={color} />
      {/* GYM strip */}
      <polygon
        points={`${-bw * 0.9},${-bd * 0.85 - h * 0.6} ${-bw * 0.08},${bd * 0.08 - h * 0.6} ${-bw * 0.08},${bd * 0.08 - h * 0.78} ${-bw * 0.9},${-bd * 0.85 - h * 0.78}`}
        fill="#1a1a1c"
      />
      <text
        x={-bw * 0.5}
        y={-bd * 0.4 - h * 0.65}
        textAnchor="middle"
        fontSize={6 * s}
        fontWeight="900"
        fill="#f2c15a"
        transform={`skewY(26.57 ${-bw * 0.5} ${-bd * 0.4 - h * 0.65})`}
      >
        GYM
      </text>
      {/* dumbbells graphic east */}
      <g transform={`translate(${bw * 0.5}, ${-bd * 0.3 - h * 0.35})`}>
        <rect x={-5} y={-1} width={10} height={2} fill="#1a1a1c" />
        <rect x={-7} y={-3} width={2} height={6} fill="#1a1a1c" />
        <rect x={5} y={-3} width={2} height={6} fill="#1a1a1c" />
      </g>
    </g>
  );
}

function CinemaSprite({ color, scale }: { color: string; scale: number }) {
  // Low building topped with an illuminated marquee + bulb trim.
  const s = scale;
  const bw = 28 * s;
  const bd = 14 * s;
  const h = 26 * s;
  return (
    <g>
      <BoxBody bw={bw} bd={bd} h={h} color={color} />
      {/* marquee box */}
      <g transform={`translate(0, ${-bd - h - 2 * s})`}>
        <polygon
          points={`${-bw * 0.9},0 0,${bd * 0.5} ${bw * 0.9},0 0,${-bd * 0.5}`}
          fill="#f2c15a"
        />
        <polygon
          points={`${-bw * 0.9},0 0,${bd * 0.5} 0,${bd * 0.5 - 6 * s} ${-bw * 0.9},${-6 * s}`}
          fill="#c99a3b"
        />
        <polygon
          points={`0,${bd * 0.5} ${bw * 0.9},0 ${bw * 0.9},${-6 * s} 0,${bd * 0.5 - 6 * s}`}
          fill="#e2ad48"
        />
      </g>
      {/* bulbs across front */}
      {Array.from({ length: 6 }).map((_, i) => (
        <circle
          key={i}
          cx={-bw * 0.7 + (i / 5) * bw * 0.8}
          cy={-bd * 0.6 - h * 0.9 + i * 0.5}
          r={0.9 * s}
          fill="#fff7c2"
        />
      ))}
    </g>
  );
}
