import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CATALOG } from '../catalog';
import { useGame } from '../store';
import { money, moneyFull, pct } from '../lib/format';
import { AssetSprite } from './AssetSprite';
import { cn } from '../lib/cn';

export function Marketplace() {
  const capital = useGame((s) => s.capital);
  const owned = useGame((s) => s.owned);
  const buyAsset = useGame((s) => s.buyAsset);
  const { plotTakerCount, vehicleCount } = useMemo(() => {
    let p = 0;
    let v = 0;
    for (const a of owned) {
      if (a.plotIndex !== undefined) p++;
      else v++;
    }
    return { plotTakerCount: p, vehicleCount: v };
  }, [owned]);
  const parkingCapacity = 1 + plotTakerCount;
  const parkingLeft = parkingCapacity - vehicleCount;
  const parkingFull = parkingLeft <= 0;

  const items = CATALOG.filter((c) => c.category === 'vehicle');

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 border-b border-line">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-xs uppercase tracking-wider text-muted">Rental Fleet</div>
          <div className="text-[11px] text-muted">
            <span className={cn('num font-semibold', parkingFull ? 'text-bad' : 'text-ink')}>
              {parkingLeft}
            </span>
            /<span className="num">{parkingCapacity}</span> parking
          </div>
        </div>
        <div className="text-[11px] text-muted mt-1">
          Houses are bought from neighbors — click a house on the map.
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {items.map((def) => {
          const net = def.monthlyIncome - def.monthlyExpense;
          const annualYield = (net * 12) / def.price;
          const parkingBlocked = parkingFull;
          const affordable = capital >= def.price;
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
                    <div className="num text-sm font-semibold text-ink">{moneyFull(def.price)}</div>
                    <div className={cn('num text-[11px]', net >= 0 ? 'text-accent' : 'text-warn')}>
                      {net >= 0 ? '+' : ''}{money(net)} /mo
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2 text-[11px] text-muted">
                  <span>Yield <span className="num text-ink">{pct(annualYield)}</span></span>
                  {def.appreciationYearly > 0 && (
                    <span>App. <span className="num text-ink">{pct(def.appreciationYearly)}</span></span>
                  )}
                  {def.depreciationYearly > 0 && (
                    <span>Dep. <span className="num text-bad">-{pct(def.depreciationYearly)}</span></span>
                  )}
                  <button
                    disabled={!buyable}
                    onClick={() => buyAsset(def.id)}
                    className={cn(
                      'ml-auto h-7 px-3 rounded-md text-xs font-semibold transition-colors',
                      buyable
                        ? 'bg-accent text-black hover:bg-emerald-300'
                        : 'bg-line text-muted cursor-not-allowed',
                    )}
                  >
                    {parkingBlocked ? 'No parking' : affordable ? 'Buy' : 'Short'}
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
