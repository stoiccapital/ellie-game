import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../store';
import { BUILDABLE_IDS, CATALOG, HOME_TIERS, NEIGHBORS } from '../catalog';
import { AssetSprite } from './AssetSprite';
import { money, moneyFull } from '../lib/format';
import {
  STREETS_X,
  STREETS_Y,
  TILE_W,
  TILE_H,
  ELLIE_PLOT,
  BUYABLE_PLOTS,
  PLOTS,
  MAX_PLOTS,
  X_MIN,
  X_MAX,
  Y_MIN,
  Y_MAX,
  iso,
  isPlotCell,
  isStreetCell,
  ambientAt,
} from '../lib/city';
import type { AssetCategory } from '../types';

type Item =
  | {
      kind: 'ellie';
      key: string;
      gx: number;
      gy: number;
      tierId: string;
      category: AssetCategory;
      color: string;
      size: number;
      footprint: number;
      sprite?: string;
      floors?: number;
    }
  | {
      kind: 'owned';
      key: string;
      gx: number;
      gy: number;
      category: AssetCategory;
      color: string;
      name: string;
      label: string;
      floors?: number;
      sprite?: string;
      footprint: number;
    }
  | {
      kind: 'neighbor';
      key: string;
      gx: number;
      gy: number;
      category: AssetCategory;
      color: string;
      name: string;
      plotIndex: number;
      footprint: number;
    }
  | {
      kind: 'empty';
      key: string;
      gx: number;
      gy: number;
      plotIndex: number;
      size: number;
    }
  | {
      kind: 'ambient';
      key: string;
      gx: number;
      gy: number;
      category: AssetCategory;
      color: string;
      scale: number;
    };

export function Scene() {
  const owned = useGame((s) => s.owned);
  const month = useGame((s) => s.month);
  const speed = useGame((s) => s.speed);
  const sellAsset = useGame((s) => s.sellAsset);
  const buyNeighbor = useGame((s) => s.buyNeighbor);
  const redevelopAsset = useGame((s) => s.redevelopAsset);
  const developEmptyPlot = useGame((s) => s.developEmptyPlot);
  const capital = useGame((s) => s.capital);
  const clearedPlots = useGame((s) => s.clearedPlots);
  const [pendingSellId, setPendingSellId] = useState<string | null>(null);
  const [pendingBuyPlot, setPendingBuyPlot] = useState<number | null>(null);
  const [pendingRedevelopId, setPendingRedevelopId] = useState<string | null>(null);
  const [pendingBuildPlot, setPendingBuildPlot] = useState<number | null>(null);

  const pendingRedevelop = useMemo(() => {
    if (!pendingRedevelopId) return null;
    const asset = owned.find((a) => a.instanceId === pendingRedevelopId);
    if (!asset) return null;
    const def = CATALOG.find((d) => d.id === asset.defId);
    if (!def) return null;
    // Look up the lot size for this asset's plot so the modal can filter
    // buildable options to things that physically fit.
    const plot = asset.plotIndex !== undefined ? BUYABLE_PLOTS[asset.plotIndex] : undefined;
    return { asset, def, plotSize: plot?.size ?? 1 };
  }, [pendingRedevelopId, owned]);

  // Pan state: mutated on each pointer move, applied directly to the pan <g> transform.
  // Initial pan centers Ellie's plot in the viewBox — the plot center is at
  // iso coordinates (0, -32) with ELLIE_PLOT at (-2,-2,size 3), so we offset by +32 y.
  const panRef = useRef({ x: 0, y: 32 });
  const panLayerRef = useRef<SVGGElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const applyPan = () => {
    if (panLayerRef.current) {
      panLayerRef.current.setAttribute('transform', `translate(${panRef.current.x}, ${panRef.current.y})`);
    }
  };
  useEffect(() => {
    applyPan();
  }, []);

  const svgScale = () => {
    if (!svgRef.current) return 1;
    const rect = svgRef.current.getBoundingClientRect();
    return rect.width > 0 ? 880 / rect.width : 1;
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      panX: panRef.current.x,
      panY: panRef.current.y,
    };
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragRef.current) return;
    const s = svgScale();
    panRef.current.x = dragRef.current.panX + (e.clientX - dragRef.current.startX) * s;
    panRef.current.y = dragRef.current.panY + (e.clientY - dragRef.current.startY) * s;
    applyPan();
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  const groundTiles = useMemo(() => {
    const tiles: React.ReactNode[] = [];
    for (let gx = X_MIN; gx <= X_MAX; gx++) {
      for (let gy = Y_MIN; gy <= Y_MAX; gy++) {
        const { x, y } = iso(gx, gy);
        // Three cell types:
        //  - plot cells: brown dirt (plot pad renders above)
        //  - street cells: medium-gray asphalt
        //  - everything else: dark empty terrain (undeveloped land)
        const plot = isPlotCell(gx, gy);
        const street = isStreetCell(gx, gy);
        const fill = plot ? '#2d2419' : street ? '#565b65' : '#1f2229';
        const stroke = plot ? '#1b150e' : street ? '#3f424a' : '#171a20';
        tiles.push(
          <polygon
            key={`t${gx}_${gy}`}
            points={`${x},${y - TILE_H / 2} ${x + TILE_W / 2},${y} ${x},${y + TILE_H / 2} ${x - TILE_W / 2},${y}`}
            fill={fill}
            stroke={stroke}
            strokeWidth={0.4}
          />,
        );
      }
    }
    return tiles;
  }, []);

  // Per-plot pad: lot boundary + lighter sidewalk strip inside the plot edge.
  // Lot interior is tinted by size so bigger lots read as commercial / landmark.
  const plotPads = useMemo(() => {
    // Lot interior colors per size — bigger lots look paved (commercial feel).
    const lotFill: Record<number, string> = {
      1: '#3a3027', // residential dirt brown
      2: '#3f362b', // slightly paved
      3: '#3d3a38', // commercial gray-brown
      4: '#38383c', // landmark asphalt
    };
    const sidewalkFill: Record<number, string> = {
      1: '#5a4a3a',
      2: '#6a5744',
      3: '#787066',
      4: '#8a8482',
    };
    return PLOTS.map((p) => {
      const corners = [
        iso(p.gx - 0.5, p.gy - 0.5),
        iso(p.gx + p.size - 0.5, p.gy - 0.5),
        iso(p.gx + p.size - 0.5, p.gy + p.size - 0.5),
        iso(p.gx - 0.5, p.gy + p.size - 0.5),
      ];
      const pts = corners.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
      const inset = 0.08;
      const sw = [
        iso(p.gx - 0.5 + inset, p.gy - 0.5 + inset),
        iso(p.gx + p.size - 0.5 - inset, p.gy - 0.5 + inset),
        iso(p.gx + p.size - 0.5 - inset, p.gy + p.size - 0.5 - inset),
        iso(p.gx - 0.5 + inset, p.gy + p.size - 0.5 - inset),
      ];
      const swPts = sw.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
      return (
        <g key={`pad_${p.gx}_${p.gy}`}>
          <polygon points={pts} fill={sidewalkFill[p.size]} opacity={0.9} />
          <polygon points={swPts} fill={lotFill[p.size]} opacity={0.95} />
        </g>
      );
    });
  }, []);

  const pendingSell = useMemo(() => {
    if (!pendingSellId) return null;
    const asset = owned.find((a) => a.instanceId === pendingSellId);
    if (!asset) return null;
    const def = CATALOG.find((d) => d.id === asset.defId);
    if (!def) return null;
    return { asset, def };
  }, [pendingSellId, owned]);

  const pendingBuy = useMemo(() => {
    if (pendingBuyPlot === null) return null;
    const neighbor = NEIGHBORS[pendingBuyPlot];
    if (!neighbor) return null;
    const def = CATALOG.find((d) => d.id === neighbor.defId);
    if (!def) return null;
    return { neighbor, def, plotIndex: pendingBuyPlot };
  }, [pendingBuyPlot]);

  const hasHome = useGame((s) => s.hasHome);
  const homeTierId = useGame((s) => s.homeTierId);
  const setHomeModalOpen = useGame((s) => s.setHomeModalOpen);

  // Trigger a one-shot upgrade pulse whenever the home tier id changes.
  const [upgradePulse, setUpgradePulse] = useState(0);
  const prevTierRef = useRef(homeTierId);
  useEffect(() => {
    if (prevTierRef.current !== homeTierId && hasHome) {
      setUpgradePulse((n) => n + 1);
    }
    prevTierRef.current = homeTierId;
  }, [homeTierId, hasHome]);

  const items: Item[] = useMemo(() => {
    const list: Item[] = [];

    // Helper: center cell for an N×N plot anchored at (gx, gy).
    const plotCenter = (gx: number, gy: number, size: number) => ({
      cx: gx + (size - 1) / 2,
      cy: gy + (size - 1) / 2,
    });

    // Ellie — only shown while she still owns her home. Centered on her plot.
    if (hasHome) {
      const tier = HOME_TIERS.find((t) => t.id === homeTierId) ?? HOME_TIERS[1];
      const { cx, cy } = plotCenter(ELLIE_PLOT.gx, ELLIE_PLOT.gy, ELLIE_PLOT.size);
      list.push({
        kind: 'ellie',
        // Keying by tier id makes AnimatePresence treat an upgrade as a swap
        // (exit the old sprite, enter the new one), which gives us a free pop animation.
        key: `ellie_${tier.id}`,
        gx: cx,
        gy: cy,
        tierId: tier.id,
        category: tier.visual.category as AssetCategory,
        color: tier.visual.color,
        size: tier.visual.size,
        sprite: tier.visual.sprite,
        floors: tier.visual.floors,
        footprint: tier.visual.footprint ?? 1,
      });
    }

    // Each plot shows either an owned house (if player bought it) or the neighbor still living there.
    const ownedByPlot = new Map<number, (typeof owned)[number]>();
    for (const a of owned) if (a.plotIndex !== undefined) ownedByPlot.set(a.plotIndex, a);

    const clearedSet = new Set(clearedPlots);
    BUYABLE_PLOTS.forEach((plot, i) => {
      const { cx, cy } = plotCenter(plot.gx, plot.gy, plot.size);
      const ownedAsset = ownedByPlot.get(i);
      if (ownedAsset) {
        const def = CATALOG.find((d) => d.id === ownedAsset.defId);
        if (!def) return;
        list.push({
          kind: 'owned',
          key: ownedAsset.instanceId,
          gx: cx,
          gy: cy,
          category: def.category,
          color: def.color,
          name: def.name,
          label: money(ownedAsset.currentValue),
          floors: def.floors,
          sprite: def.sprite,
          footprint: def.footprint ?? 1,
        });
        return;
      }
      if (clearedSet.has(i)) {
        // Neighbor bought out, nothing built here yet — buildable empty lot.
        list.push({
          kind: 'empty',
          key: `empty_${i}`,
          gx: cx,
          gy: cy,
          plotIndex: i,
          size: plot.size,
        });
        return;
      }
      const neighbor = NEIGHBORS[i];
      if (!neighbor) return;
      const def = CATALOG.find((d) => d.id === neighbor.defId);
      if (!def) return;
      list.push({
        kind: 'neighbor',
        key: `nb_${i}`,
        gx: cx,
        gy: cy,
        category: def.category,
        color: def.color,
        name: neighbor.name,
        plotIndex: i,
        footprint: def.footprint ?? 1,
      });
    });

    // Ambient city background buildings (currently disabled — ambientAt returns null)
    for (let x = X_MIN; x <= X_MAX; x++) {
      for (let y = Y_MIN; y <= Y_MAX; y++) {
        const amb = ambientAt(x, y);
        if (!amb) continue;
        list.push({
          kind: 'ambient',
          key: `amb_${x}_${y}`,
          gx: x,
          gy: y,
          category: amb.category,
          color: amb.color,
          scale: amb.scale,
        });
      }
    }

    list.sort((a, b) => a.gx + a.gy - (b.gx + b.gy));
    return list;
  }, [owned, clearedPlots, hasHome, homeTierId]);

  const dayPhase = (Math.sin((month / 12) * Math.PI * 2) + 1) / 2;
  const skyTop = `hsl(230, 30%, ${7 + dayPhase * 6}%)`;
  const skyBot = `hsl(265, 25%, ${3 + dayPhase * 4}%)`;

  // Vehicle layer removed from the map.

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 30%, ${skyTop} 0%, ${skyBot} 75%)`,
          transition: 'background 500ms ease',
        }}
      />
      {speed === 10 && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.06, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ background: 'linear-gradient(180deg, transparent, #7cfcb940 60%, transparent)' }}
        />
      )}

      <svg
        ref={svgRef}
        viewBox="-1400 -750 2800 1500"
        className="absolute inset-0 w-full h-full"
        style={{ cursor: dragRef.current ? 'grabbing' : 'grab', touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <defs>
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f2d6a0" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#f2d6a0" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="roadStripe" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d4b14a" stopOpacity="0" />
            <stop offset="50%" stopColor="#d4b14a" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#d4b14a" stopOpacity="0" />
          </linearGradient>
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.2" />
          </filter>
        </defs>

        <g ref={panLayerRef}>
        {/* Ground tiles */}
        <g>
          {groundTiles}
        </g>

        {/* Per-plot pads — show the land allocated to each lot */}
        <g>{plotPads}</g>

        {/* Road markings — grouped by street band width.
            Scale: 1 cell = 10 m, so a 1-cell gap is a 10 m residential alley,
            2-cell = 20 m urban avenue, 3-cell = 30 m downtown boulevard. */}
        <StreetMarkings axesX={STREETS_X} axesY={STREETS_Y} xMin={X_MIN} xMax={X_MAX} yMin={Y_MIN} yMax={Y_MAX} />

        {/* Warm glow under Ellie's house (centered on her plot) */}
        {hasHome && (() => {
          const cx = ELLIE_PLOT.gx + (ELLIE_PLOT.size - 1) / 2;
          const cy = ELLIE_PLOT.gy + (ELLIE_PLOT.size - 1) / 2;
          const p = iso(cx, cy);
          return (
            <ellipse cx={p.x} cy={p.y} rx={180} ry={90} fill="url(#centerGlow)" />
          );
        })()}

        {/* Upgrade celebration — concentric gold rings + sparkle shower. */}
        {upgradePulse > 0 && (() => {
          const cx = ELLIE_PLOT.gx + (ELLIE_PLOT.size - 1) / 2;
          const cy = ELLIE_PLOT.gy + (ELLIE_PLOT.size - 1) / 2;
          const p = iso(cx, cy);
          return (
            <UpgradeBurst key={`pulse_${upgradePulse}`} x={p.x} y={p.y} />
          );
        })()}

        {/* Traffic removed — no cars on the map. */}

        {/* All items sorted back-to-front */}
        <AnimatePresence>
          {items.map((it) => {
            const { x, y } = iso(it.gx, it.gy);
            return (
              <motion.g
                key={it.key}
                initial={
                  it.kind === 'owned' || it.kind === 'ellie'
                    ? { opacity: 0, scale: 0.3, x, y: y - 24 }
                    : { x, y }
                }
                animate={{
                  opacity: it.kind === 'ambient' ? 0.72 : 1,
                  scale: 1,
                  x,
                  y,
                }}
                exit={
                  it.kind === 'ellie'
                    ? { opacity: 0, scale: 0.3, y: y + 10 }
                    : { opacity: 0, scale: 0.4 }
                }
                transition={
                  it.kind === 'owned' || it.kind === 'ellie'
                    ? { type: 'spring', stiffness: 220, damping: 18 }
                    : { duration: 0 }
                }
                whileHover={
                  it.kind === 'owned' || it.kind === 'neighbor' || it.kind === 'ellie' || it.kind === 'empty'
                    ? { scale: 1.08 }
                    : undefined
                }
                style={
                  it.kind === 'owned' || it.kind === 'neighbor' || it.kind === 'ellie' || it.kind === 'empty'
                    ? { cursor: 'pointer' }
                    : undefined
                }
                onClick={
                  it.kind === 'owned'
                    ? () => setPendingSellId(it.key)
                    : it.kind === 'neighbor'
                    ? () => setPendingBuyPlot(it.plotIndex)
                    : it.kind === 'ellie'
                    ? () => setHomeModalOpen(true)
                    : it.kind === 'empty'
                    ? () => setPendingBuildPlot(it.plotIndex)
                    : undefined
                }
              >
                {it.kind === 'ellie' ? (() => {
                  const fpMul = 0.8 + 0.5 * it.footprint;
                  const spriteSize = it.size * fpMul;
                  return (
                    <>
                      <ellipse
                        cx={0}
                        cy={6}
                        rx={28 * (spriteSize / 1.25)}
                        ry={7 * (spriteSize / 1.25)}
                        fill="#000"
                        opacity={0.35}
                      />
                      <AssetSprite
                        category={it.category}
                        color={it.color}
                        size={spriteSize}
                        sprite={it.sprite}
                        floors={it.floors}
                      />
                    </>
                  );
                })() : it.kind === 'owned' ? (() => {
                  const fpMul = 0.8 + 0.5 * it.footprint;
                  return (
                    <>
                      <ellipse cx={0} cy={6} rx={22 * fpMul} ry={6 * fpMul} fill="#000" opacity={0.35} />
                      <AssetSprite
                        category={it.category}
                        color={it.color}
                        size={fpMul}
                        floors={it.floors}
                        sprite={it.sprite}
                      />
                    </>
                  );
                })() : it.kind === 'neighbor' ? (() => {
                  const fpMul = 0.8 + 0.5 * it.footprint;
                  return (
                    <>
                      <ellipse cx={0} cy={6} rx={22 * fpMul} ry={6 * fpMul} fill="#000" opacity={0.3} />
                      <AssetSprite category={it.category} color={it.color} size={0.95 * fpMul} />
                    </>
                  );
                })() : it.kind === 'empty' ? (() => {
                  // Buildable empty lot — show a dashed outline and a "+" badge.
                  const fpMul = 0.8 + 0.5 * it.size;
                  const r = 14 * fpMul;
                  return (
                    <>
                      <circle
                        cx={0}
                        cy={0}
                        r={r}
                        fill="rgba(242, 214, 160, 0.08)"
                        stroke="#f2d6a0"
                        strokeWidth={0.8}
                        strokeDasharray="3 2"
                      />
                      <text
                        x={0}
                        y={3}
                        textAnchor="middle"
                        fontSize={10 * fpMul}
                        fill="#f2d6a0"
                        fontWeight={700}
                      >
                        +
                      </text>
                    </>
                  );
                })() : (
                  // ambient
                  <>
                    <ellipse
                      cx={0}
                      cy={6}
                      rx={22 * it.scale}
                      ry={6 * it.scale}
                      fill="#000"
                      opacity={0.35}
                    />
                    <AssetSprite category={it.category} color={it.color} size={it.scale} />
                  </>
                )}
              </motion.g>
            );
          })}
        </AnimatePresence>

        {/* Labels overlay — rendered after all sprites so they're never occluded by foreground buildings. */}
        <g pointerEvents="none">
          {items.map((it) => {
            if (it.kind === 'ambient') return null;
            const { x, y } = iso(it.gx, it.gy);
            if (it.kind === 'ellie') {
              return (
                <g key={`lbl_${it.key}`} transform={`translate(${x}, ${y})`}>
                  <LabelPill text="Ellie's House" y={26} color="#f2d6a0" fontSize={9} />
                </g>
              );
            }
            if (it.kind === 'owned') {
              return (
                <g key={`lbl_${it.key}`} transform={`translate(${x}, ${y})`}>
                  <LabelPill text={it.name} y={22} color="#f2d6a0" fontSize={8} />
                  <LabelPill text={it.label} y={34} color="#d9dde3" fontSize={8} />
                </g>
              );
            }
            if (it.kind === 'neighbor') {
              return (
                <g key={`lbl_${it.key}`} transform={`translate(${x}, ${y})`}>
                  <LabelPill text={it.name} y={22} color="#c9cfd8" fontSize={8} />
                </g>
              );
            }
            // empty — show the lot size and a hint.
            return (
              <g key={`lbl_${it.key}`} transform={`translate(${x}, ${y})`}>
                <LabelPill text={`Empty ${it.size}×${it.size}`} y={22} color="#f2d6a0" fontSize={7} />
              </g>
            );
          })}
        </g>
        </g>
      </svg>

      <AnimatePresence>
        {pendingSell && (
          <motion.div
            key="sell-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-sm z-10"
            onClick={() => setPendingSellId(null)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 6 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 6 }}
              transition={{ type: 'spring', stiffness: 320, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
              className="w-[320px] max-w-[90vw] rounded-xl border border-line bg-panel shadow-2xl overflow-hidden"
            >
              <div className="px-4 pt-4 pb-3 border-b border-line flex items-center gap-3">
                <div className="w-12 h-12 flex-shrink-0 rounded-md bg-black/30 border border-line flex items-center justify-center">
                  <svg viewBox="-30 -30 60 60" className="w-full h-full">
                    <AssetSprite category={pendingSell.def.category} color={pendingSell.def.color} size={0.7} />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-ink truncate">
                    Sell {pendingSell.def.name}?
                  </div>
                  <div className="text-[11px] text-muted">
                    Held <span className="num text-ink">{month - pendingSell.asset.purchasedMonth}</span> mo
                  </div>
                </div>
              </div>
              <div className="px-4 py-3 text-xs space-y-1.5">
                <Row label="Current value" value={moneyFull(pendingSell.asset.currentValue)} tone="ink" />
                <Row label="Purchased for" value={moneyFull(pendingSell.asset.purchasePrice)} tone="muted" />
                <Row
                  label="Gain / loss"
                  value={`${pendingSell.asset.currentValue - pendingSell.asset.purchasePrice >= 0 ? '+' : ''}${money(
                    pendingSell.asset.currentValue - pendingSell.asset.purchasePrice,
                  )}`}
                  tone={pendingSell.asset.currentValue - pendingSell.asset.purchasePrice >= 0 ? 'accent' : 'bad'}
                />
              </div>
              <div className="px-4 pb-4 flex items-center gap-2">
                <button
                  onClick={() => setPendingSellId(null)}
                  className="h-9 flex-1 rounded-md text-xs font-semibold border border-line text-muted hover:text-ink hover:border-ink/40 transition-colors"
                >
                  Keep
                </button>
                {pendingSell.asset.plotIndex !== undefined && (
                  <button
                    onClick={() => {
                      setPendingRedevelopId(pendingSellId);
                      setPendingSellId(null);
                    }}
                    className="h-9 flex-1 rounded-md text-xs font-semibold border border-emerald-400/40 text-accent hover:bg-emerald-400/10 transition-colors"
                  >
                    Redevelop…
                  </button>
                )}
                <button
                  onClick={() => {
                    sellAsset(pendingSellId!);
                    setPendingSellId(null);
                  }}
                  className="h-9 flex-1 rounded-md text-xs font-semibold bg-accent text-black hover:bg-emerald-300 transition-colors"
                >
                  Sell · {money(pendingSell.asset.currentValue)}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingRedevelop && (
          <motion.div
            key="redevelop-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-sm z-10"
            onClick={() => setPendingRedevelopId(null)}
          >
            <motion.div
              initial={{ scale: 0.94, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 8 }}
              transition={{ type: 'spring', stiffness: 320, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
              className="w-[420px] max-w-[92vw] max-h-[85vh] rounded-xl border border-line bg-panel shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="px-4 pt-4 pb-3 border-b border-line">
                <div className="text-sm font-semibold text-ink">
                  Redevelop {pendingRedevelop.def.name}
                </div>
                <div className="text-[11px] text-muted mt-0.5">
                  Demolish and construct a new building on this plot. The new structure replaces
                  the old one at full construction cost.
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {BUILDABLE_IDS.filter((bid) => {
                  const d = CATALOG.find((c) => c.id === bid);
                  return d && (d.footprint ?? 1) <= pendingRedevelop.plotSize;
                }).map((bid) => {
                  const def = CATALOG.find((d) => d.id === bid);
                  if (!def) return null;
                  const net = def.monthlyIncome - def.monthlyExpense;
                  const affordable = capital >= def.price;
                  const sameAsCurrent = bid === pendingRedevelop.def.id;
                  return (
                    <div
                      key={bid}
                      className="rounded-lg border border-line bg-panel2 p-3 flex gap-3 items-center"
                    >
                      <div className="w-14 h-14 flex-shrink-0 rounded-md bg-black/30 border border-line flex items-center justify-center">
                        <svg viewBox="-40 -60 80 80" className="w-full h-full">
                          <AssetSprite
                            category={def.category}
                            color={def.color}
                            size={def.category === 'tower' ? 0.6 : 0.85}
                            floors={def.floors}
                            sprite={def.sprite}
                          />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-ink truncate">{def.name}</div>
                        <div className="text-[11px] text-muted mt-0.5 flex items-center gap-2">
                          <span className="num text-ink">{moneyFull(def.price)}</span>
                          <span className={net >= 0 ? 'num text-accent' : 'num text-bad'}>
                            {net >= 0 ? '+' : ''}{money(net)} /mo
                          </span>
                        </div>
                      </div>
                      <button
                        disabled={!affordable || sameAsCurrent}
                        onClick={() => {
                          if (redevelopAsset(pendingRedevelopId!, bid)) {
                            setPendingRedevelopId(null);
                          }
                        }}
                        className={`h-8 px-3 rounded-md text-[11px] font-semibold transition-colors ${
                          !affordable || sameAsCurrent
                            ? 'bg-line text-muted cursor-not-allowed'
                            : 'bg-accent text-black hover:bg-emerald-300'
                        }`}
                      >
                        {sameAsCurrent ? 'Current' : affordable ? 'Build' : 'Short'}
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="px-4 py-3 border-t border-line flex justify-end">
                <button
                  onClick={() => setPendingRedevelopId(null)}
                  className="h-8 px-4 rounded-md text-xs font-semibold border border-line text-muted hover:text-ink hover:border-ink/40 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Build on empty lot modal */}
      <AnimatePresence>
        {pendingBuildPlot !== null && (() => {
          const plot = BUYABLE_PLOTS[pendingBuildPlot];
          if (!plot) return null;
          return (
            <motion.div
              key="build-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-sm z-10"
              onClick={() => setPendingBuildPlot(null)}
            >
              <motion.div
                initial={{ scale: 0.94, y: 8 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.94, y: 8 }}
                transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                onClick={(e) => e.stopPropagation()}
                className="w-[420px] max-w-[92vw] max-h-[85vh] rounded-xl border border-line bg-panel shadow-2xl flex flex-col overflow-hidden"
              >
                <div className="px-4 pt-4 pb-3 border-b border-line">
                  <div className="text-sm font-semibold text-ink">
                    Build on empty lot
                  </div>
                  <div className="text-[11px] text-muted mt-0.5">
                    Lot size <span className="num text-ink">{plot.size}×{plot.size}</span>. Pick a building that fits.
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {BUILDABLE_IDS.filter((bid) => {
                    const d = CATALOG.find((c) => c.id === bid);
                    return d && (d.footprint ?? 1) <= plot.size;
                  }).map((bid) => {
                    const def = CATALOG.find((d) => d.id === bid);
                    if (!def) return null;
                    const net = def.monthlyIncome - def.monthlyExpense;
                    const affordable = capital >= def.price;
                    return (
                      <div
                        key={bid}
                        className="rounded-lg border border-line bg-panel2 p-3 flex gap-3 items-center"
                      >
                        <div className="w-14 h-14 flex-shrink-0 rounded-md bg-black/30 border border-line flex items-center justify-center">
                          <svg viewBox="-40 -60 80 80" className="w-full h-full">
                            <AssetSprite
                              category={def.category}
                              color={def.color}
                              size={def.category === 'tower' ? 0.6 : 0.85}
                              floors={def.floors}
                              sprite={def.sprite}
                            />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-ink truncate">{def.name}</div>
                          <div className="text-[11px] text-muted mt-0.5 flex items-center gap-2">
                            <span className="num text-ink">{moneyFull(def.price)}</span>
                            <span className={net >= 0 ? 'num text-accent' : 'num text-bad'}>
                              {net >= 0 ? '+' : ''}{money(net)} /mo
                            </span>
                          </div>
                        </div>
                        <button
                          disabled={!affordable}
                          onClick={() => {
                            if (developEmptyPlot(pendingBuildPlot!, bid)) {
                              setPendingBuildPlot(null);
                            }
                          }}
                          className={`h-8 px-3 rounded-md text-[11px] font-semibold transition-colors ${
                            !affordable
                              ? 'bg-line text-muted cursor-not-allowed'
                              : 'bg-accent text-black hover:bg-emerald-300'
                          }`}
                        >
                          {affordable ? 'Build' : 'Short'}
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="px-4 py-3 border-t border-line flex justify-end">
                  <button
                    onClick={() => setPendingBuildPlot(null)}
                    className="h-8 px-4 rounded-md text-xs font-semibold border border-line text-muted hover:text-ink hover:border-ink/40 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      <AnimatePresence>
        {pendingBuy && (
          <motion.div
            key="buy-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-sm z-10"
            onClick={() => setPendingBuyPlot(null)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 6 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 6 }}
              transition={{ type: 'spring', stiffness: 320, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
              className="w-[340px] max-w-[90vw] rounded-xl border border-line bg-panel shadow-2xl overflow-hidden"
            >
              <div className="px-4 pt-4 pb-3 border-b border-line flex items-center gap-3">
                <div className="w-12 h-12 flex-shrink-0 rounded-md bg-black/30 border border-line flex items-center justify-center">
                  <svg viewBox="-30 -30 60 60" className="w-full h-full">
                    <AssetSprite category={pendingBuy.def.category} color={pendingBuy.def.color} size={0.7} />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-ink truncate">
                    {pendingBuy.neighbor.name} is selling
                  </div>
                  <div className="text-[11px] text-muted truncate">{pendingBuy.def.name}</div>
                </div>
              </div>
              <div className="px-4 py-3 text-xs space-y-1.5">
                <Row label="Asking price" value={moneyFull(pendingBuy.def.price)} tone="ink" />
                <Row
                  label="Monthly cashflow"
                  value={`${pendingBuy.def.monthlyIncome - pendingBuy.def.monthlyExpense >= 0 ? '+' : ''}${money(
                    pendingBuy.def.monthlyIncome - pendingBuy.def.monthlyExpense,
                  )} /mo`}
                  tone={pendingBuy.def.monthlyIncome - pendingBuy.def.monthlyExpense >= 0 ? 'accent' : 'bad'}
                />
                <Row
                  label="Your capital"
                  value={moneyFull(capital)}
                  tone={capital >= pendingBuy.def.price ? 'ink' : 'bad'}
                />
              </div>
              <div className="px-4 pb-4 flex items-center gap-2">
                <button
                  onClick={() => setPendingBuyPlot(null)}
                  className="h-9 flex-1 rounded-md text-xs font-semibold border border-line text-muted hover:text-ink hover:border-ink/40 transition-colors"
                >
                  Pass
                </button>
                <button
                  disabled={capital < pendingBuy.def.price}
                  onClick={() => {
                    if (buyNeighbor(pendingBuy.plotIndex)) setPendingBuyPlot(null);
                  }}
                  className={`h-9 flex-1 rounded-md text-xs font-semibold transition-colors ${
                    capital >= pendingBuy.def.price
                      ? 'bg-accent text-black hover:bg-emerald-300'
                      : 'bg-line text-muted cursor-not-allowed'
                  }`}
                >
                  {capital >= pendingBuy.def.price
                    ? `Buy for ${money(pendingBuy.def.price)}`
                    : 'Short'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-4 left-4 px-3 py-2 rounded-lg bg-panel/80 border border-line backdrop-blur text-xs text-muted">
        <span className="num text-ink font-semibold">
          {owned.filter((a) => {
            const d = CATALOG.find((c) => c.id === a.defId);
            return d && d.category !== 'vehicle';
          }).length}
        </span>{' '}
        / <span className="num text-ink">{MAX_PLOTS}</span> plots developed
      </div>
    </div>
  );
}

function LabelPill({
  text,
  y,
  color,
  fontSize,
}: {
  text: string;
  y: number;
  color: string;
  fontSize: number;
}) {
  const padX = 4;
  const h = fontSize + 4;
  const w = text.length * fontSize * 0.62 + padX * 2;
  return (
    <>
      <rect
        x={-w / 2}
        y={y - h + 2}
        width={w}
        height={h}
        rx={2}
        fill="rgba(10, 12, 16, 0.82)"
      />
      <text
        x={0}
        y={y}
        textAnchor="middle"
        fontSize={fontSize}
        fill={color}
        style={{ letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}
      >
        {text}
      </text>
    </>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone: 'ink' | 'muted' | 'accent' | 'bad' }) {
  const toneClass = { ink: 'text-ink', muted: 'text-muted', accent: 'text-accent', bad: 'text-bad' }[tone];
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className={`num font-semibold ${toneClass}`}>{value}</span>
    </div>
  );
}


function UpgradeBurst({ x, y }: { x: number; y: number }) {
  // Three concentric iso rings pulsing outward.
  const rings = [
    { rx0: 42, ry0: 20, rx1: 180, ry1: 90, delay: 0.0, dur: 1.1, color: '#f2d6a0', stroke: 2.0 },
    { rx0: 36, ry0: 17, rx1: 150, ry1: 75, delay: 0.12, dur: 1.0, color: '#ffd27a', stroke: 1.4 },
    { rx0: 30, ry0: 14, rx1: 120, ry1: 60, delay: 0.24, dur: 0.95, color: '#ffffff', stroke: 1.0 },
  ];
  // Gold sparkle shower rising from the plot.
  const sparkles = Array.from({ length: 18 }, (_, i) => {
    const angle = (i / 18) * Math.PI * 2;
    const dist = 60 + Math.random() * 40;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist * 0.45 - 20 - Math.random() * 25;
    const size = 1.1 + Math.random() * 1.2;
    const delay = Math.random() * 0.35;
    return { dx, dy, size, delay };
  });
  return (
    <g pointerEvents="none">
      {/* Soft base flash */}
      <motion.ellipse
        cx={x}
        cy={y}
        rx={100}
        ry={50}
        fill="#f2d6a0"
        initial={{ opacity: 0.55 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      />
      {/* Expanding rings */}
      {rings.map((r, i) => (
        <motion.ellipse
          key={i}
          cx={x}
          cy={y}
          fill="none"
          stroke={r.color}
          strokeWidth={r.stroke}
          initial={{ opacity: 0.95, rx: r.rx0, ry: r.ry0 }}
          animate={{ opacity: 0, rx: r.rx1, ry: r.ry1 }}
          transition={{ duration: r.dur, delay: r.delay, ease: 'easeOut' }}
        />
      ))}
      {/* Rising gold sparkles */}
      {sparkles.map((s, i) => (
        <motion.circle
          key={i}
          cx={x}
          cy={y}
          r={s.size}
          fill="#ffe39a"
          initial={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
          animate={{ opacity: [0, 1, 0], x: s.dx, y: s.dy, scale: 1 }}
          transition={{ duration: 1.2, delay: s.delay, ease: 'easeOut' }}
        />
      ))}
      {/* Central starburst */}
      <motion.g
        initial={{ opacity: 0, scale: 0.3 }}
        animate={{ opacity: [0, 1, 0], scale: 1.6 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        {[0, 45, 90, 135].map((a) => (
          <line
            key={a}
            x1={x}
            y1={y}
            x2={x + Math.cos((a * Math.PI) / 180) * 18}
            y2={y + Math.sin((a * Math.PI) / 180) * 9}
            stroke="#ffffff"
            strokeWidth={1.6}
            opacity={0.9}
          />
        ))}
      </motion.g>
    </g>
  );
}

// ─── Street markings ────────────────────────────────────────────────────────
// Groups consecutive full-street axes into bands and draws per-band stripes.
// Scale: 1 cell = 10 m. 1-cell band = residential alley (yellow center dash).
// 2-cell band = urban avenue (white dashed lane divider down the middle).
// 3-cell band = boulevard (two solid white edge lines + dashed yellow median).
interface StreetBand {
  center: number; // midpoint between the first and last full-street cell
  edgeLo: number; // outer edge of the band (plot side, low)
  edgeHi: number; // outer edge of the band (plot side, high)
  cells: number;  // width in cells
}

function groupBands(axis: number[]): StreetBand[] {
  if (axis.length === 0) return [];
  const sorted = [...axis].sort((a, b) => a - b);
  const bands: StreetBand[] = [];
  let start = sorted[0];
  let end = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      bands.push({ center: (start + end) / 2, edgeLo: start - 0.5, edgeHi: end + 0.5, cells: end - start + 1 });
      start = sorted[i];
      end = sorted[i];
    }
  }
  bands.push({ center: (start + end) / 2, edgeLo: start - 0.5, edgeHi: end + 0.5, cells: end - start + 1 });
  return bands;
}

function StreetMarkings({
  axesX,
  axesY,
  xMin,
  xMax,
  yMin,
  yMax,
}: {
  axesX: number[];
  axesY: number[];
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}) {
  const bandsX = groupBands(axesX);
  const bandsY = groupBands(axesY);

  const renderHorizontal = (b: StreetBand, key: string) => {
    const stripes: React.ReactNode[] = [];
    const a0 = iso(xMin - 0.5, b.center);
    const b0 = iso(xMax + 0.5, b.center);
    if (b.cells === 1) {
      // Residential alley (10 m): yellow center dash
      stripes.push(
        <line key={`${key}c`} x1={a0.x} y1={a0.y} x2={b0.x} y2={b0.y}
          stroke="#f4c75e" strokeWidth={1.2} strokeDasharray="8 6" opacity={0.9} />,
      );
    } else if (b.cells === 2) {
      // Urban avenue (20 m): white dashed lane divider down the middle
      stripes.push(
        <line key={`${key}c`} x1={a0.x} y1={a0.y} x2={b0.x} y2={b0.y}
          stroke="#f8f3dc" strokeWidth={1.4} strokeDasharray="12 8" opacity={1} />,
      );
    } else {
      // Boulevard (30 m+): solid white edge lines + yellow dashed median
      const edgeOff = (b.cells - 1) / 2 - 0.15;
      const eLoA = iso(xMin - 0.5, b.center - edgeOff);
      const eLoB = iso(xMax + 0.5, b.center - edgeOff);
      const eHiA = iso(xMin - 0.5, b.center + edgeOff);
      const eHiB = iso(xMax + 0.5, b.center + edgeOff);
      stripes.push(
        <line key={`${key}eLo`} x1={eLoA.x} y1={eLoA.y} x2={eLoB.x} y2={eLoB.y}
          stroke="#f8f3dc" strokeWidth={1.6} opacity={1} />,
        <line key={`${key}eHi`} x1={eHiA.x} y1={eHiA.y} x2={eHiB.x} y2={eHiB.y}
          stroke="#f8f3dc" strokeWidth={1.6} opacity={1} />,
        <line key={`${key}m`} x1={a0.x} y1={a0.y} x2={b0.x} y2={b0.y}
          stroke="#f4c75e" strokeWidth={1.3} strokeDasharray="16 10" opacity={0.95} />,
      );
    }
    return <g key={key}>{stripes}</g>;
  };

  const renderVertical = (b: StreetBand, key: string) => {
    const stripes: React.ReactNode[] = [];
    const a0 = iso(b.center, yMin - 0.5);
    const b0 = iso(b.center, yMax + 0.5);
    if (b.cells === 1) {
      stripes.push(
        <line key={`${key}c`} x1={a0.x} y1={a0.y} x2={b0.x} y2={b0.y}
          stroke="#f4c75e" strokeWidth={1.2} strokeDasharray="8 6" opacity={0.9} />,
      );
    } else if (b.cells === 2) {
      stripes.push(
        <line key={`${key}c`} x1={a0.x} y1={a0.y} x2={b0.x} y2={b0.y}
          stroke="#f8f3dc" strokeWidth={1.4} strokeDasharray="12 8" opacity={1} />,
      );
    } else {
      const edgeOff = (b.cells - 1) / 2 - 0.15;
      const eLoA = iso(b.center - edgeOff, yMin - 0.5);
      const eLoB = iso(b.center - edgeOff, yMax + 0.5);
      const eHiA = iso(b.center + edgeOff, yMin - 0.5);
      const eHiB = iso(b.center + edgeOff, yMax + 0.5);
      stripes.push(
        <line key={`${key}eLo`} x1={eLoA.x} y1={eLoA.y} x2={eLoB.x} y2={eLoB.y}
          stroke="#f8f3dc" strokeWidth={1.6} opacity={1} />,
        <line key={`${key}eHi`} x1={eHiA.x} y1={eHiA.y} x2={eHiB.x} y2={eHiB.y}
          stroke="#f8f3dc" strokeWidth={1.6} opacity={1} />,
        <line key={`${key}m`} x1={a0.x} y1={a0.y} x2={b0.x} y2={b0.y}
          stroke="#f4c75e" strokeWidth={1.3} strokeDasharray="16 10" opacity={0.95} />,
      );
    }
    return <g key={key}>{stripes}</g>;
  };

  // Crosswalk zebra stripes at every intersection where a 2+ cell band crosses
  // another 2+ cell band. Four short zebra bars (one on each approach).
  const crosswalks: React.ReactNode[] = [];
  const zebra = (
    k: string,
    cx: number,
    cy: number,
    bandAxis: 'x' | 'y',
    bandCells: number,
  ) => {
    // Lay 4 bars along the crossing band at the approach to the intersection.
    const barCount = Math.max(3, bandCells + 1);
    const halfSpan = bandCells / 2;
    const barLen = 0.28;
    for (let i = 0; i < barCount; i++) {
      const t = (i + 0.5) / barCount;
      const u = -halfSpan + t * (halfSpan * 2);
      let aPt, bPt;
      if (bandAxis === 'x') {
        aPt = iso(cx + u, cy - barLen);
        bPt = iso(cx + u, cy + barLen);
      } else {
        aPt = iso(cx - barLen, cy + u);
        bPt = iso(cx + barLen, cy + u);
      }
      crosswalks.push(
        <line
          key={`${k}_${i}`}
          x1={aPt.x} y1={aPt.y} x2={bPt.x} y2={bPt.y}
          stroke="#f8f3dc" strokeWidth={1.3} opacity={0.75}
        />,
      );
    }
  };
  for (const bx of bandsX) {
    if (bx.cells < 2) continue;
    for (const by of bandsY) {
      if (by.cells < 2) continue;
      // Approach from the north (just inside the north side of the Y band)
      zebra(`cwN_${bx.center}_${by.center}`, bx.center, by.edgeLo + 0.4, 'x', bx.cells);
      zebra(`cwS_${bx.center}_${by.center}`, bx.center, by.edgeHi - 0.4, 'x', bx.cells);
      zebra(`cwW_${bx.center}_${by.center}`, bx.edgeLo + 0.4, by.center, 'y', by.cells);
      zebra(`cwE_${bx.center}_${by.center}`, bx.edgeHi - 0.4, by.center, 'y', by.cells);
    }
  }

  return (
    <>
      {bandsY.map((b, i) => renderHorizontal(b, `h${i}`))}
      {bandsX.map((b, i) => renderVertical(b, `v${i}`))}
      <g>{crosswalks}</g>
    </>
  );
}
