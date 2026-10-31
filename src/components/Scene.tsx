import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../store';
import { BUILDABLE_IDS, CATALOG, HOME_TIERS, NEIGHBORS } from '../catalog';
import { AssetSprite } from './AssetSprite';
import { money, moneyFull } from '../lib/format';
import {
  STREETS,
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
  isStreet,
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
        const street = isStreet(gx, gy);
        // Streets = medium asphalt gray that stands out against the dark sky.
        // Plot cells = dark brown dirt so lot pads layered above still read clearly.
        const fill = street ? '#4e535c' : '#2d2419';
        const stroke = street ? '#3a3e46' : '#1b150e';
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

  // Ambient traffic + any owned vehicles driving on the roads
  const vehicles = useMemo(() => {
    const base = VEHICLES.map((spec, i) => ({ spec, id: `amb_${i}`, owned: false as const }));
    const ownedVehicles = owned.flatMap((a) => {
      const def = CATALOG.find((d) => d.id === a.defId);
      if (!def || def.category !== 'vehicle') return [];
      const units = a.units ?? 1;
      // One rendered car per unit, each with a deterministic spec from a unique id.
      return Array.from({ length: units }, (_, i) => {
        const id = units > 1 ? `${a.instanceId}#${i}` : a.instanceId;
        return {
          spec: ownedVehicleSpec(id, def.color),
          id,
          // Shared sell handler needs the original stack id, not the per-unit suffix.
          sellStackId: a.instanceId,
          name: def.name,
          owned: true as const,
        };
      });
    });
    return [...base, ...ownedVehicles];
  }, [owned]);

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

        {/* Road center lane markings — solid yellow dashes on each street
            row/column. Visible against the medium-gray asphalt. */}
        <g>
          {STREETS_Y.map((s) => {
            const a = iso(X_MIN - 0.5, s);
            const b = iso(X_MAX + 0.5, s);
            return (
              <line
                key={`hr${s}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="#f2c15a"
                strokeWidth={1.1}
                strokeDasharray="10 8"
                opacity={0.85}
              />
            );
          })}
          {STREETS_X.map((s) => {
            const a = iso(s, Y_MIN - 0.5);
            const b = iso(s, Y_MAX + 0.5);
            return (
              <line
                key={`vr${s}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="#f2c15a"
                strokeWidth={1.1}
                strokeDasharray="10 8"
                opacity={0.85}
              />
            );
          })}
        </g>

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

        {/* Traffic simulation — vehicles obey lights, drawn behind houses so buildings occlude them */}
        <TrafficSim
          specs={vehicles}
          onOwnedClick={(_id, stackId) => setPendingSellId(stackId ?? _id)}
        />

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

type VehicleKind = 'car' | 'bike';

interface VehicleSpec {
  axis: 'x' | 'y';
  fixed: number;
  kind: VehicleKind;
  color: string;
  color2?: string;
  duration: number;
  delay: number;
  reverse: boolean;
}

const VEHICLES: VehicleSpec[] = [
  // horizontal roads
  { axis: 'x', fixed: 0, kind: 'car', color: '#d9b672', duration: 11, delay: 0, reverse: false },
  { axis: 'x', fixed: 0, kind: 'bike', color: '#e07070', color2: '#2a2a2e', duration: 7, delay: 4, reverse: true },
  { axis: 'x', fixed: -3, kind: 'car', color: '#4a6fa5', duration: 13, delay: 2.5, reverse: true },
  { axis: 'x', fixed: 3, kind: 'bike', color: '#7cb59e', color2: '#1f1f22', duration: 8, delay: 1, reverse: false },
  // vertical roads
  { axis: 'y', fixed: 0, kind: 'car', color: '#c9a97a', duration: 12, delay: 1.8, reverse: true },
  { axis: 'y', fixed: -3, kind: 'bike', color: '#f2c15a', color2: '#1a1a1c', duration: 7.5, delay: 5.5, reverse: false },
  { axis: 'y', fixed: 3, kind: 'car', color: '#b48ac1', duration: 14, delay: 6, reverse: true },
  { axis: 'y', fixed: 3, kind: 'bike', color: '#9bb3d9', color2: '#2a2a2e', duration: 8.5, delay: 10, reverse: false },
];

function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function ownedVehicleSpec(instanceId: string, color: string): VehicleSpec {
  const h = hashStr(instanceId);
  const fixedOpts = [-3, 0, 3];
  const kinds: VehicleKind[] = ['car', 'bike'];
  return {
    axis: h & 1 ? 'x' : 'y',
    fixed: fixedOpts[(h >> 1) % 3],
    kind: kinds[(h >> 3) & 1],
    color,
    color2: '#1f1f22',
    duration: 9 + ((h >> 5) % 70) / 10,
    delay: ((h >> 11) % 120) / 10,
    reverse: ((h >> 4) & 1) === 1,
  };
}

type Dir = 'se' | 'sw' | 'nw' | 'ne';

function dirOf(spec: VehicleSpec): Dir {
  if (spec.axis === 'x') return spec.reverse ? 'nw' : 'se';
  return spec.reverse ? 'ne' : 'sw';
}

// === Traffic simulation ===========================================================
// 10 s cycle: x-axis green 0–4, yellow 4–5, red 5–10 / y-axis mirrored.
// Vehicles drive on the right-hand lane (0.35 cell offset from street centerline).
// They decelerate to stop at the stop line when the light for their axis is red/yellow.

const CYCLE = 10;
const LANE_OFFSET = 0.35;
const STOP_BEFORE = 0.9;   // units before intersection center to stop
const BRAKE_DIST = 2.2;    // start braking this far before the stop line

function laneOffset(spec: VehicleSpec): number {
  if (spec.axis === 'x') return spec.reverse ? -LANE_OFFSET : LANE_OFFSET;
  return spec.reverse ? LANE_OFFSET : -LANE_OFFSET;
}

type LightColor = 'green' | 'yellow' | 'red';

function axisLight(cycleT: number, axis: 'x' | 'y'): LightColor {
  if (axis === 'x') {
    if (cycleT < 4) return 'green';
    if (cycleT < 5) return 'yellow';
    return 'red';
  }
  if (cycleT < 5) return 'red';
  if (cycleT < 9) return 'green';
  return 'yellow';
}

interface RuntimeVehicle {
  spec: VehicleSpec;
  id: string;
  startU: number;
  endU: number;
  u: number;
  speed: number;
  maxSpeed: number;
}

const WRAP_EDGE = 14;    // off-screen for all lane configurations
const FADE_DIST = 2.0;   // fade in/out near wrap edges

function initRuntime(spec: VehicleSpec, id: string): RuntimeVehicle {
  const startU = spec.reverse ? WRAP_EDGE : -WRAP_EDGE;
  const endU = spec.reverse ? -WRAP_EDGE : WRAP_EDGE;
  const span = Math.abs(endU - startU);
  const t = (spec.delay % spec.duration) / spec.duration;
  const u = startU + (endU - startU) * t;
  const maxSpeed = span / spec.duration;
  return { spec, id, startU, endU, u, speed: maxSpeed * 0.6, maxSpeed };
}

function updateVehicle(v: RuntimeVehicle, dt: number, cycleT: number) {
  const dir = v.spec.reverse ? -1 : 1;

  // Find next intersection ahead on travel axis
  let nextDist = Infinity;
  let nextCrossPos: number | null = null;
  for (const cross of STREETS) {
    const d = (cross - v.u) * dir;
    if (d > 0.001 && d < nextDist) {
      nextDist = d;
      nextCrossPos = cross;
    }
  }

  let target = v.maxSpeed;
  let hardStop: number | null = null;

  if (nextCrossPos !== null) {
    const stopLineDist = nextDist - STOP_BEFORE;
    const light = axisLight(cycleT, v.spec.axis);
    if (light !== 'green' && stopLineDist < BRAKE_DIST) {
      const factor = Math.max(0, stopLineDist / BRAKE_DIST);
      target = v.maxSpeed * factor;
      if (light === 'red') hardStop = nextCrossPos - STOP_BEFORE * dir;
    }
  }

  const accel = v.maxSpeed * 1.4;
  const brake = v.maxSpeed * 2.2;
  if (v.speed < target) v.speed = Math.min(target, v.speed + accel * dt);
  else v.speed = Math.max(target, v.speed - brake * dt);

  v.u += v.speed * dir * dt;

  // One-sided clamp at stop line — never reverse
  if (hardStop !== null) {
    const over = (v.u - hardStop) * dir;
    if (over > 0) {
      v.u = hardStop;
      v.speed = 0;
    }
  }

  if ((v.u - v.endU) * dir >= 0) {
    v.u = v.startU;
    v.speed = v.maxSpeed * 0.5;
  }
}

function edgeOpacity(v: RuntimeVehicle): number {
  const fromStart = Math.abs(v.u - v.startU);
  const fromEnd = Math.abs(v.u - v.endU);
  return Math.max(0, Math.min(1, Math.min(fromStart, fromEnd) / FADE_DIST));
}

function TrafficSim({
  specs,
  onOwnedClick,
}: {
  specs: Array<{ spec: VehicleSpec; id: string; name?: string; owned: boolean; sellStackId?: string }>;
  onOwnedClick: (id: string, sellStackId?: string) => void;
}) {
  const vehicleRefs = useRef(new Map<string, SVGGElement | null>());
  const lightRefs = useRef(new Map<string, SVGCircleElement | null>());
  const states = useRef<RuntimeVehicle[]>([]);

  useLayoutEffect(() => {
    const existing = new Map(states.current.map((s) => [s.id, s]));
    states.current = specs.map(({ spec, id }) => {
      const prev = existing.get(id);
      if (prev && prev.spec === spec) return prev;
      return initRuntime(spec, id);
    });
  }, [specs]);

  useEffect(() => {
    let last = performance.now();
    let frame = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.08, (now - last) / 1000);
      last = now;
      const cycleT = (now / 1000) % CYCLE;

      for (const v of states.current) {
        updateVehicle(v, dt, cycleT);
        const g = vehicleRefs.current.get(v.id);
        if (g) {
          const fixed = v.spec.fixed + laneOffset(v.spec);
          const p = v.spec.axis === 'x' ? iso(v.u, fixed) : iso(fixed, v.u);
          g.setAttribute('transform', `translate(${p.x}, ${p.y})`);
          g.setAttribute('opacity', edgeOpacity(v).toFixed(3));
        }
      }

      const xC = axisLight(cycleT, 'x');
      const yC = axisLight(cycleT, 'y');
      lightRefs.current.forEach((el, key) => {
        if (!el) return;
        const [axis, , color] = key.split('|');
        const active = ((axis as 'x' | 'y') === 'x' ? xC : yC) === (color as LightColor);
        el.setAttribute('opacity', active ? '1' : '0.18');
      });

      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <>
      <g>
        {STREETS.flatMap((ix) =>
          STREETS.map((iy) => {
            const base = iso(ix, iy);
            return (
              <g key={`int_${ix}_${iy}`}>
                <LightPole
                  x={base.x - 14}
                  y={base.y - 3}
                  axis="x"
                  id={`${ix}_${iy}`}
                  lightRefs={lightRefs}
                />
                <LightPole
                  x={base.x + 14}
                  y={base.y - 3}
                  axis="y"
                  id={`${ix}_${iy}`}
                  lightRefs={lightRefs}
                />
              </g>
            );
          }),
        )}
      </g>
      <g>
        {specs.map(({ spec, id, name, owned, sellStackId }) => (
          <g
            key={id}
            ref={(el) => {
              if (el) vehicleRefs.current.set(id, el);
              else vehicleRefs.current.delete(id);
            }}
            onClick={owned ? () => onOwnedClick(id, sellStackId) : undefined}
            style={owned ? { cursor: 'pointer' } : undefined}
          >
            <IsoVehicle kind={spec.kind} dir={dirOf(spec)} color={spec.color} color2={spec.color2} />
            {name && (
              <>
                <rect
                  x={-name.length * 2.6}
                  y={-24}
                  width={name.length * 5.2}
                  height={10}
                  rx={2}
                  fill="rgba(0,0,0,0.7)"
                />
                <text
                  x={0}
                  y={-17}
                  textAnchor="middle"
                  fontSize={7}
                  fill="#f2d6a0"
                  style={{ letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}
                >
                  {name}
                </text>
              </>
            )}
          </g>
        ))}
      </g>
    </>
  );
}

function LightPole({
  x,
  y,
  axis,
  id,
  lightRefs,
}: {
  x: number;
  y: number;
  axis: 'x' | 'y';
  id: string;
  lightRefs: React.MutableRefObject<Map<string, SVGCircleElement | null>>;
}) {
  const makeRef = (color: LightColor) => (el: SVGCircleElement | null) => {
    const key = `${axis}|${id}|${color}`;
    if (el) lightRefs.current.set(key, el);
    else lightRefs.current.delete(key);
  };
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={-1.1} y={-11} width={2.2} height={11} fill="#1f1f22" rx={0.5} />
      <circle cx={0} cy={-9} r={1.1} fill="#ff5a5a" opacity={0.18} ref={makeRef('red')} />
      <circle cx={0} cy={-6.5} r={1.1} fill="#f2c15a" opacity={0.18} ref={makeRef('yellow')} />
      <circle cx={0} cy={-4} r={1.1} fill="#4ad17d" opacity={0.18} ref={makeRef('green')} />
    </g>
  );
}

function IsoVehicle({
  kind,
  dir,
  color,
  color2,
}: {
  kind: VehicleKind;
  dir: Dir;
  color: string;
  color2?: string;
}) {
  const L = kind === 'car' ? 0.38 : 0.26;
  const W = kind === 'car' ? 0.17 : 0.09;
  const H = kind === 'car' ? 0.22 : 0.16;
  const UNIT = 32;

  const family: 'x' | 'y' = dir === 'se' || dir === 'nw' ? 'x' : 'y';
  const fIso: [number, number] = family === 'x' ? [UNIT, UNIT / 2] : [-UNIT, UNIT / 2];
  const rIso: [number, number] = family === 'x' ? [-UNIT, UNIT / 2] : [-UNIT, -UNIT / 2];
  const fvec: [number, number] = [fIso[0] * L, fIso[1] * L];
  const rvec: [number, number] = [rIso[0] * W, rIso[1] * W];
  const UP: [number, number] = [0, -UNIT * H];

  const v = (sF: number, sR: number, sU: number): [number, number] => [
    sF * fvec[0] + sR * rvec[0] + sU * UP[0],
    sF * fvec[1] + sR * rvec[1] + sU * UP[1],
  ];
  const BL = v(-1, -1, 0);
  const BR = v(-1, +1, 0);
  const FL = v(+1, -1, 0);
  const FR = v(+1, +1, 0);
  const BL_T = v(-1, -1, 1);
  const BR_T = v(-1, +1, 1);
  const FL_T = v(+1, -1, 1);
  const FR_T = v(+1, +1, 1);

  // World +gridX face (always visible)
  const worldEast: [number, number][] =
    family === 'x' ? [FL, FR, FR_T, FL_T] : [BL, FL, FL_T, BL_T];
  // World +gridY face (always visible)
  const worldSouth: [number, number][] =
    family === 'x' ? [BR, FR, FR_T, BR_T] : [FL, FR, FR_T, FL_T];
  const topFace: [number, number][] = [BL_T, FL_T, FR_T, BR_T];

  // End face shows the forward/backward direction of the car. Side face shows a side.
  // Family 'x': end = worldEast, side = worldSouth.
  // Family 'y': end = worldSouth, side = worldEast.
  const endFace = family === 'x' ? worldEast : worldSouth;
  const sideFace = family === 'x' ? worldSouth : worldEast;
  // SE and SW have the car's front on the end face. NW/NE show the car's back.
  const showFront = dir === 'se' || dir === 'sw';

  const topFill = shade(color, 0.12);
  const sideFill = shade(color, -0.08);
  const endFill = shade(color, -0.22);
  const windowFill = showFront ? 'rgba(150,195,230,0.7)' : 'rgba(150,195,230,0.4)';
  const sideWindowFill = 'rgba(150,195,230,0.5)';
  const lightFill = showFront ? '#fdf6b0' : '#f06060';

  // Flat ground shadow sized to base bounding box
  const baseXs = [BL[0], BR[0], FL[0], FR[0]];
  const baseYs = [BL[1], BR[1], FL[1], FR[1]];
  const sCx = (Math.min(...baseXs) + Math.max(...baseXs)) / 2;
  const sCy = (Math.min(...baseYs) + Math.max(...baseYs)) / 2 + 1.5;
  const sRx = (Math.max(...baseXs) - Math.min(...baseXs)) / 2 + 1.5;
  const sRy = (Math.max(...baseYs) - Math.min(...baseYs)) / 2 + 1.2;

  const toPts = (poly: [number, number][]) =>
    poly.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const upperHalf = (face: [number, number][]): [number, number][] => {
    const [bl, br, tr, tl] = face;
    const ml: [number, number] = [lerp(bl[0], tl[0], 0.55), lerp(bl[1], tl[1], 0.55)];
    const mr: [number, number] = [lerp(br[0], tr[0], 0.55), lerp(br[1], tr[1], 0.55)];
    return [ml, mr, tr, tl];
  };
  const centerPanel = (face: [number, number][]): [number, number][] => {
    const [bl, br, tr, tl] = face;
    // panel from 20%→80% along length, 35%→80% along height
    const bl2: [number, number] = [lerp(bl[0], br[0], 0.2), lerp(bl[1], br[1], 0.2)];
    const br2: [number, number] = [lerp(bl[0], br[0], 0.8), lerp(bl[1], br[1], 0.8)];
    const tl2: [number, number] = [lerp(tl[0], tr[0], 0.2), lerp(tl[1], tr[1], 0.2)];
    const tr2: [number, number] = [lerp(tl[0], tr[0], 0.8), lerp(tl[1], tr[1], 0.8)];
    const b_mid_l: [number, number] = [lerp(bl2[0], tl2[0], 0.35), lerp(bl2[1], tl2[1], 0.35)];
    const b_mid_r: [number, number] = [lerp(br2[0], tr2[0], 0.35), lerp(br2[1], tr2[1], 0.35)];
    const t_mid_l: [number, number] = [lerp(bl2[0], tl2[0], 0.8), lerp(bl2[1], tl2[1], 0.8)];
    const t_mid_r: [number, number] = [lerp(br2[0], tr2[0], 0.8), lerp(br2[1], tr2[1], 0.8)];
    return [b_mid_l, b_mid_r, t_mid_r, t_mid_l];
  };

  if (kind === 'car') {
    return (
      <g>
        <ellipse cx={sCx} cy={sCy} rx={sRx} ry={sRy} fill="rgba(0,0,0,0.55)" />
        {/* draw back-most face first for layering */}
        <polygon points={toPts(sideFace)} fill={family === 'x' ? sideFill : endFill} />
        <polygon points={toPts(endFace)} fill={family === 'x' ? endFill : sideFill} />
        <polygon points={toPts(topFace)} fill={topFill} />
        {/* windshield / rear window on end face */}
        <polygon points={toPts(upperHalf(endFace))} fill={windowFill} />
        {/* side window on side face */}
        <polygon points={toPts(centerPanel(sideFace))} fill={sideWindowFill} />
        {/* lights at end-face bottom corners */}
        <circle
          cx={lerp(endFace[0][0], endFace[3][0], 0.1)}
          cy={lerp(endFace[0][1], endFace[3][1], 0.1)}
          r={0.8}
          fill={lightFill}
        />
        <circle
          cx={lerp(endFace[1][0], endFace[2][0], 0.1)}
          cy={lerp(endFace[1][1], endFace[2][1], 0.1)}
          r={0.8}
          fill={lightFill}
        />
      </g>
    );
  }

  // bike: iso box body + rider on top + headlight
  const topCx = (BL_T[0] + FR_T[0]) / 2;
  const topCy = (BL_T[1] + FR_T[1]) / 2;
  const headCx = topCx + fvec[0] * 0.35;
  const headCy = topCy + fvec[1] * 0.35 - 3.5;
  const jacket = color2 ?? '#1f1f22';
  return (
    <g>
      <ellipse cx={sCx} cy={sCy} rx={sRx} ry={sRy} fill="rgba(0,0,0,0.5)" />
      <polygon points={toPts(sideFace)} fill={family === 'x' ? sideFill : endFill} />
      <polygon points={toPts(endFace)} fill={family === 'x' ? endFill : sideFill} />
      <polygon points={toPts(topFace)} fill={topFill} />
      {/* rider torso sitting on seat */}
      <ellipse cx={topCx} cy={topCy - 1.8} rx={2.2} ry={1.6} fill={jacket} />
      {/* helmet forward on torso */}
      <circle cx={headCx} cy={headCy} r={1.5} fill="#1a1a1c" />
      <circle
        cx={headCx + fvec[0] * 0.1}
        cy={headCy + fvec[1] * 0.1}
        r={0.65}
        fill="rgba(170,200,230,0.65)"
      />
      {/* headlight / taillight */}
      <circle
        cx={lerp(endFace[0][0], endFace[3][0], 0.15)}
        cy={lerp(endFace[0][1], endFace[3][1], 0.15)}
        r={0.6}
        fill={lightFill}
      />
      <circle
        cx={lerp(endFace[1][0], endFace[2][0], 0.15)}
        cy={lerp(endFace[1][1], endFace[2][1], 0.15)}
        r={0.6}
        fill={lightFill}
      />
    </g>
  );
}

function shade(hex: string, amount: number) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const adj = (c: number) => Math.max(0, Math.min(255, Math.round(c + 255 * amount)));
  return `rgb(${adj(r)}, ${adj(g)}, ${adj(b)})`;
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
