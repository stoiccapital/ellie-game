import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CATALOG, NEIGHBORS } from '../catalog';
import { BUYABLE_PLOTS } from '../lib/city';
import { useGame } from '../store';
import { money, moneyFull, pct } from '../lib/format';
import { AssetSprite } from './AssetSprite';
import { cn } from '../lib/cn';
import type { AssetCategory } from '../types';

type TabKey = 'property' | 'vehicle' | 'business' | 'etf';
const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'property', label: 'Properties' },
  { key: 'vehicle', label: 'Vehicles' },
  { key: 'business', label: 'Businesses' },
  { key: 'etf', label: 'ETFs' },
];

export function Marketplace() {
  const capital = useGame((s) => s.capital);
  const owned = useGame((s) => s.owned);
  const buyAsset = useGame((s) => s.buyAsset);
  const buyAssetBulk = useGame((s) => s.buyAssetBulk);
  const buyNeighbor = useGame((s) => s.buyNeighbor);
  const clearedPlots = useGame((s) => s.clearedPlots);
  const [tab, setTab] = useState<TabKey>('property');
  const [propSort, setPropSort] = useState<'price' | 'yield' | 'size'>('price');
  const [etfAmount, setEtfAmount] = useState<Record<string, string>>({});
  const [bizQty, setBizQty] = useState<Record<string, string>>({});

  const { plotTakerCount, vehicleCount } = useMemo(() => {
    let p = 0;
    let v = 0;
    for (const a of owned) {
      if (a.plotIndex !== undefined) p++;
      else {
        const def = CATALOG.find((c) => c.id === a.defId);
        if (def?.category === 'vehicle') v += a.units ?? 1;
      }
    }
    return { plotTakerCount: p, vehicleCount: v };
  }, [owned]);
  const parkingCapacity = 1 + plotTakerCount;
  const parkingLeft = parkingCapacity - vehicleCount;
  const parkingFull = parkingLeft <= 0;

  const items = tab === 'property' ? [] : CATALOG.filter((c) => c.category === (tab as AssetCategory));

  // Available neighbor properties the player can buy from the list.
  // A plot is listable while the neighbor still lives there (not cleared, not owned).
  const properties = useMemo(() => {
    if (tab !== 'property') return [];
    const clearedSet = new Set(clearedPlots);
    const ownedPlots = new Set(owned.map((a) => a.plotIndex).filter((i) => i !== undefined) as number[]);
    const rows: Array<{
      plotIndex: number;
      neighborName: string;
      def: typeof CATALOG[number];
      size: number;
      net: number;
      annualYield: number;
    }> = [];
    BUYABLE_PLOTS.forEach((plot, i) => {
      if (clearedSet.has(i)) return;
      if (ownedPlots.has(i)) return;
      const neighbor = NEIGHBORS[i];
      if (!neighbor) return;
      const def = CATALOG.find((d) => d.id === neighbor.defId);
      if (!def) return;
      const net = def.monthlyIncome - def.monthlyExpense;
      const annualYield = def.price > 0 ? (net * 12) / def.price : 0;
      rows.push({ plotIndex: i, neighborName: neighbor.name, def, size: plot.size, net, annualYield });
    });
    if (propSort === 'price') rows.sort((a, b) => a.def.price - b.def.price);
    else if (propSort === 'yield') rows.sort((a, b) => b.annualYield - a.annualYield);
    else rows.sort((a, b) => a.size - b.size || a.def.price - b.def.price);
    return rows;
  }, [tab, propSort, clearedPlots, owned]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2 border-b border-line">
        <div className="flex items-center gap-1 mb-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'h-7 px-3 rounded-md text-xs font-semibold transition-colors',
                tab === t.key
                  ? 'bg-panel2 border border-ink/30 text-ink'
                  : 'border border-transparent text-muted hover:text-ink',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        {tab === 'vehicle' && (
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-[11px] text-muted">
              Houses are bought from neighbors — click a house on the map.
            </div>
            <div className="text-[11px] text-muted">
              <span className={cn('num font-semibold', parkingFull ? 'text-bad' : 'text-ink')}>
                {parkingLeft}
              </span>
              /<span className="num">{parkingCapacity}</span> parking
            </div>
          </div>
        )}
        {tab === 'business' && (
          <div className="text-[11px] text-muted">
            Owner-operated ventures. No plot required.
          </div>
        )}
        {tab === 'etf' && (
          <div className="text-[11px] text-muted">
            Buy any dollar amount. Price drifts with trend + volatility; monthly dividend paid in cash.
          </div>
        )}
        {tab === 'property' && (
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-[11px] text-muted">
              <span className="num text-ink">{properties.length}</span> plots for sale across the city.
            </div>
            <div className="flex items-center gap-1 text-[10px]">
              <span className="text-muted uppercase tracking-wider">Sort</span>
              {(['price', 'yield', 'size'] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setPropSort(k)}
                  className={cn(
                    'h-5 px-1.5 rounded text-[10px] font-semibold transition-colors',
                    propSort === k ? 'text-ink border border-ink/40' : 'text-muted hover:text-ink',
                  )}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {tab === 'property' && properties.map(({ plotIndex, neighborName, def, size, net, annualYield }) => {
          const affordable = capital >= def.price;
          return (
            <motion.div
              key={plotIndex}
              layout
              className={cn(
                'rounded-lg border bg-panel2 p-2.5 flex gap-2.5 items-center transition-colors',
                affordable ? 'border-line hover:border-emerald-400/30' : 'border-line opacity-60',
              )}
            >
              <div className="w-11 h-11 flex-shrink-0 rounded-md bg-black/30 border border-line flex items-center justify-center">
                <svg viewBox="-40 -60 80 80" className="w-full h-full">
                  <AssetSprite
                    category={def.category}
                    color={def.color}
                    size={def.category === 'tower' ? 0.5 : 0.75}
                    floors={def.floors}
                    sprite={def.sprite}
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-ink truncate">{def.name}</div>
                <div className="text-[10px] text-muted truncate">
                  Seller <span className="text-ink">{neighborName}</span>
                  {' · '}
                  Lot <span className="num text-ink">{size}×{size}</span>
                </div>
                <div className="text-[10px] text-muted mt-0.5">
                  Yield <span className="num text-ink">{pct(annualYield)}</span>
                  {' · '}
                  <span className={net >= 0 ? 'num text-accent' : 'num text-bad'}>
                    {net >= 0 ? '+' : ''}{money(net)} /mo
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="num text-xs font-semibold text-ink">{moneyFull(def.price)}</div>
                <button
                  onClick={() => buyNeighbor(plotIndex)}
                  disabled={!affordable}
                  className={cn(
                    'mt-1 h-6 px-2 rounded text-[10px] font-semibold transition-colors',
                    affordable
                      ? 'bg-accent text-black hover:bg-emerald-300'
                      : 'bg-line text-muted cursor-not-allowed',
                  )}
                >
                  {affordable ? 'Buy' : 'Short'}
                </button>
              </div>
            </motion.div>
          );
        })}
        {items.map((def) => {
          const net = def.monthlyIncome - def.monthlyExpense;
          const yieldPerDollar = def.price > 0 ? (net / def.price) : 0;
          const annualYield = yieldPerDollar * 12;
          const parkingBlocked = tab === 'vehicle' && parkingFull;
          const affordable = tab === 'etf' ? capital > 0 : capital >= def.price;
          const buyable = affordable && !parkingBlocked;
          return (
            <motion.div
              key={def.id}
              layout
              className={cn(
                'rounded-lg border bg-panel2 p-3 flex gap-3 transition-colors',
                affordable ? 'border-line hover:border-emerald-400/30' : 'border-line opacity-60',
              )}
            >
              <div className="w-16 h-16 flex-shrink-0 rounded-md bg-black/30 border border-line flex items-center justify-center">
                <svg viewBox="-40 -40 80 80" className="w-full h-full">
                  <AssetSprite category={def.category} color={def.color} size={0.9} />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-ink leading-tight">{def.name}</div>
                    <div className="text-[11px] text-muted mt-0.5">{def.description}</div>
                  </div>
                  <div className="text-right">
                    {tab === 'etf' ? (
                      <>
                        <div className="num text-[11px] text-muted">
                          Yield <span className="text-ink">{pct(annualYield)}</span>
                        </div>
                        {def.volatility !== undefined && (
                          <div className="num text-[11px] text-muted">
                            Vol <span className="text-ink">±{(def.volatility * 100).toFixed(1)}%</span>
                          </div>
                        )}
                        {def.appreciationYearly > 0 && (
                          <div className="num text-[11px] text-muted">
                            Drift <span className="text-ink">{pct(def.appreciationYearly)}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="num text-sm font-semibold text-ink">{moneyFull(def.price)}</div>
                        <div className={cn('num text-[11px]', net >= 0 ? 'text-accent' : 'text-warn')}>
                          {net >= 0 ? '+' : ''}{money(net)} /mo
                        </div>
                      </>
                    )}
                  </div>
                </div>
                {tab !== 'etf' && (
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-muted">
                    <span>Yield <span className="num text-ink">{pct(annualYield)}</span></span>
                    {tab === 'business' && def.maxOwned !== undefined && (() => {
                      const ownedOfType = owned.reduce((n, a) => a.defId === def.id ? n + (a.units ?? 1) : n, 0);
                      return (
                        <span>
                          Owned <span className={cn('num', ownedOfType >= def.maxOwned ? 'text-bad' : 'text-ink')}>
                            {ownedOfType}
                          </span>
                          /<span className="num text-ink">{def.maxOwned}</span>
                        </span>
                      );
                    })()}
                  </div>
                )}
                <div className="mt-2 flex items-center gap-2">
                  {tab === 'etf' ? (() => {
                    const maxSpend = Math.max(0, Math.floor(capital));
                    const requested = Math.max(0, Math.floor(Number(etfAmount[def.id] || 0)));
                    const spend = Math.min(requested, maxSpend);
                    const canBuy = spend > 0 && capital >= spend;
                    return (
                      <>
                        <input
                          type="number"
                          min={0}
                          step={100}
                          value={etfAmount[def.id] ?? ''}
                          onChange={(e) => setEtfAmount({ ...etfAmount, [def.id]: e.target.value })}
                          placeholder="$ amount"
                          className="flex-1 h-7 px-2 rounded-md bg-panel border border-line text-xs num text-ink focus:outline-none focus:border-ink/40"
                        />
                        <button
                          onClick={() => setEtfAmount({ ...etfAmount, [def.id]: String(maxSpend) })}
                          disabled={maxSpend <= 0}
                          className={cn(
                            'h-7 px-2 rounded-md text-[11px] font-semibold border transition-colors',
                            maxSpend > 0
                              ? 'border-line text-muted hover:text-ink hover:border-ink/40'
                              : 'border-line text-muted/50 cursor-not-allowed',
                          )}
                          title={`Max ${moneyFull(maxSpend)}`}
                        >
                          Max
                        </button>
                        <button
                          onClick={() => {
                            if (spend <= 0) return;
                            if (buyAsset(def.id, spend)) {
                              setEtfAmount({ ...etfAmount, [def.id]: '' });
                            }
                          }}
                          disabled={!canBuy}
                          className={cn(
                            'h-7 px-3 rounded-md text-[11px] font-semibold transition-colors',
                            canBuy
                              ? 'bg-accent text-black hover:bg-emerald-300'
                              : 'bg-line text-muted cursor-not-allowed',
                          )}
                        >
                          {spend > 0 ? `Buy ${money(spend)}` : 'Buy'}
                        </button>
                      </>
                    );
                  })() : tab === 'business' ? (
                    (() => {
                      const ownedOfType = owned.reduce((n, a) => a.defId === def.id ? n + (a.units ?? 1) : n, 0);
                      const remainingCap = def.maxOwned !== undefined
                        ? Math.max(0, def.maxOwned - ownedOfType)
                        : Infinity;
                      const affordableQty = Math.max(0, Math.floor(capital / def.price));
                      const maxQty = Math.min(affordableQty, remainingCap);
                      const qty = Math.max(0, Math.floor(Number(bizQty[def.id] || 0)));
                      const canBuy = qty > 0 && qty <= maxQty;
                      const total = qty * def.price;
                      const atCap = remainingCap <= 0;
                      return (
                        <>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={bizQty[def.id] ?? ''}
                            onChange={(e) => setBizQty({ ...bizQty, [def.id]: e.target.value })}
                            placeholder="Qty"
                            disabled={atCap}
                            className="w-16 h-7 px-2 rounded-md bg-panel border border-line text-xs num text-ink focus:outline-none focus:border-ink/40 disabled:opacity-50"
                          />
                          <button
                            onClick={() => setBizQty({ ...bizQty, [def.id]: String(maxQty) })}
                            disabled={maxQty <= 0}
                            className={cn(
                              'h-7 px-2 rounded-md text-[11px] font-semibold border transition-colors',
                              maxQty > 0
                                ? 'border-line text-muted hover:text-ink hover:border-ink/40'
                                : 'border-line text-muted/50 cursor-not-allowed',
                            )}
                            title={`Max ${maxQty}`}
                          >
                            Max {maxQty}
                          </button>
                          <button
                            onClick={() => {
                              const bought = buyAssetBulk(def.id, qty);
                              if (bought > 0) setBizQty({ ...bizQty, [def.id]: '' });
                            }}
                            disabled={!canBuy}
                            className={cn(
                              'flex-1 h-7 px-3 rounded-md text-[11px] font-semibold transition-colors',
                              canBuy
                                ? 'bg-accent text-black hover:bg-emerald-300'
                                : 'bg-line text-muted cursor-not-allowed',
                            )}
                          >
                            {atCap
                              ? 'At cap'
                              : qty <= 0
                              ? `Buy · ${moneyFull(def.price)}`
                              : qty > maxQty
                              ? 'Short'
                              : `Buy ${qty} · ${moneyFull(total)}`}
                          </button>
                        </>
                      );
                    })()
                  ) : (
                    <button
                      onClick={() => buyAsset(def.id)}
                      disabled={!buyable}
                      className={cn(
                        'flex-1 h-7 px-3 rounded-md text-[11px] font-semibold transition-colors',
                        buyable
                          ? 'bg-accent text-black hover:bg-emerald-300'
                          : 'bg-line text-muted cursor-not-allowed',
                      )}
                    >
                      {!affordable ? 'Short' : parkingBlocked ? 'No parking' : `Buy ${moneyFull(def.price)}`}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
