import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../store';
import { CATALOG } from '../catalog';
import { money, timeStamp } from '../lib/format';
import { AssetSprite } from './AssetSprite';

export function Portfolio() {
  const owned = useGame((s) => s.owned);
  const month = useGame((s) => s.month);
  const sellAsset = useGame((s) => s.sellAsset);

  const rows = useMemo(() => {
    return owned.map((asset) => {
      const def = CATALOG.find((d) => d.id === asset.defId)!;
      const units = asset.units ?? 1;
      const net = (def.monthlyIncome - def.monthlyExpense) * units;
      const gain = (asset.currentValue - asset.purchasePrice) * units;
      const totalValue = asset.currentValue * units;
      const held = month - asset.purchasedMonth;
      return { asset, def, net, gain, held, units, totalValue };
    });
  }, [owned, month]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-line">
        <div className="text-xs uppercase tracking-wider text-muted">Portfolio</div>
        <div className="num text-sm text-ink mt-1">{owned.length} holdings</div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {rows.length === 0 && (
          <div className="text-center text-xs text-muted py-8 border border-dashed border-line rounded-lg">
            No holdings yet. Buy from the marketplace.
          </div>
        )}
        <AnimatePresence>
          {rows.map(({ asset, def, net, gain, held, units, totalValue }) => (
            <motion.div
              key={asset.instanceId}
              layout
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="rounded-lg border border-line bg-panel2 p-2.5 flex items-center gap-2.5"
            >
              <div className="w-10 h-10 flex-shrink-0 rounded bg-black/30 border border-line flex items-center justify-center">
                <svg viewBox="-30 -30 60 60" className="w-full h-full">
                  <AssetSprite category={def.category} color={def.color} size={0.6} />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-ink truncate">
                  {def.name}
                  {units > 1 && (
                    <span className="ml-1.5 num text-[10px] text-muted">×{units}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted">
                  <span className="num text-ink">{money(totalValue)}</span>
                  <span className={gain >= 0 ? 'text-accent' : 'text-bad'}>
                    {gain >= 0 ? '+' : ''}{money(gain)}
                  </span>
                  <span>· held <span className="num">{timeStamp(held).label}</span></span>
                </div>
              </div>
              <div className="text-right">
                <div className={`num text-[11px] font-semibold ${net >= 0 ? 'text-accent' : 'text-warn'}`}>
                  {net >= 0 ? '+' : ''}{money(net)}
                </div>
                <button
                  onClick={() => sellAsset(asset.instanceId)}
                  className="mt-0.5 h-5 px-2 rounded text-[10px] text-muted hover:text-bad border border-line hover:border-bad/40 transition-colors"
                >
                  Sell
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
