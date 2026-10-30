import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CATALOG } from '../catalog';
import { useGame } from '../store';
import { money, moneyFull, pct } from '../lib/format';
import { AssetSprite } from './AssetSprite';
import { cn } from '../lib/cn';
import type { AssetCategory } from '../types';

type TabKey = 'vehicle' | 'business' | 'etf';
const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'vehicle', label: 'Vehicles' },
  { key: 'business', label: 'Businesses' },
  { key: 'etf', label: 'ETFs' },
];

export function Marketplace() {
  const capital = useGame((s) => s.capital);
  const owned = useGame((s) => s.owned);
  const buyAsset = useGame((s) => s.buyAsset);
  const [tab, setTab] = useState<TabKey>('vehicle');
  const [etfAmount, setEtfAmount] = useState<Record<string, string>>({});

  const { plotTakerCount, vehicleCount } = useMemo(() => {
    let p = 0;
    let v = 0;
    for (const a of owned) {
      if (a.plotIndex !== undefined) p++;
      else {
        const def = CATALOG.find((c) => c.id === a.defId);
        if (def?.category === 'vehicle') v++;
      }
    }
    return { plotTakerCount: p, vehicleCount: v };
  }, [owned]);
  const parkingCapacity = 1 + plotTakerCount;
  const parkingLeft = parkingCapacity - vehicleCount;
  const parkingFull = parkingLeft <= 0;

  const items = CATALOG.filter((c) => c.category === (tab as AssetCategory));

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
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
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
                  </div>
                )}
                <div className="mt-2 flex items-center gap-2">
                  {tab === 'etf' ? (
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
                        onClick={() => {
                          const amt = Math.max(0, Math.floor(Number(etfAmount[def.id] || 0)));
                          if (amt <= 0) return;
                          if (buyAsset(def.id, amt)) {
                            setEtfAmount({ ...etfAmount, [def.id]: '' });
                          }
                        }}
                        disabled={!buyable}
                        className={cn(
                          'h-7 px-3 rounded-md text-[11px] font-semibold transition-colors',
                          buyable
                            ? 'bg-accent text-black hover:bg-emerald-300'
                            : 'bg-line text-muted cursor-not-allowed',
                        )}
                      >
                        Buy
                      </button>
                    </>
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
