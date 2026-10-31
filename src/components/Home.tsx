import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../store';
import { HOME_TIERS, RENT_MONTHLY } from '../catalog';
import { money, moneyFull } from '../lib/format';
import { cn } from '../lib/cn';

export function Home() {
  const open = useGame((s) => s.homeModalOpen);
  const setOpen = useGame((s) => s.setHomeModalOpen);
  const hasHome = useGame((s) => s.hasHome);
  const homeValue = useGame((s) => s.homeValue);
  const homeTierId = useGame((s) => s.homeTierId);
  const debt = useGame((s) => s.debt);
  const capital = useGame((s) => s.capital);
  const sellHome = useGame((s) => s.sellHome);
  const upgradeHome = useGame((s) => s.upgradeHome);

  const currentTier = HOME_TIERS.find((t) => t.id === homeTierId) ?? HOME_TIERS[1];
  const sellPayoff = hasHome ? Math.min(debt, homeValue) : 0;
  const sellProceeds = hasHome ? Math.max(0, homeValue - sellPayoff) : 0;
  const onClose = () => setOpen(false);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed inset-0 flex items-center justify-center bg-black/55 backdrop-blur-sm z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.94, y: 6 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.94, y: 6 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
            className="w-[480px] max-w-[94vw] max-h-[88vh] rounded-xl border border-line bg-panel shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="px-4 pt-4 pb-3 border-b border-line">
              <div className="text-sm font-semibold text-ink">
                {hasHome ? currentTier.name : 'Renting'}
              </div>
              <div className="text-[11px] text-muted mt-0.5">
                {hasHome
                  ? `Current value ${moneyFull(homeValue)} · Upkeep ${money(currentTier.monthlyExpense)}/mo · Appreciates ${(currentTier.appreciationYearly * 100).toFixed(1)}%/yr`
                  : `Monthly rent: ${money(RENT_MONTHLY)}. No home appreciation.`}
              </div>
            </div>

            {hasHome && (
              <div className="px-4 py-3 border-b border-line text-xs space-y-1.5 bg-panel2/40">
                <Row label="Home value" value={moneyFull(homeValue)} tone="ink" />
                <Row label="Mortgage payoff on sale" value={moneyFull(sellPayoff)} tone={sellPayoff > 0 ? 'bad' : 'muted'} />
                <Row label="Cash from sale" value={moneyFull(sellProceeds)} tone="accent" />
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-muted mb-1">Home tiers</div>
              {HOME_TIERS.map((tier) => {
                const isCurrent = hasHome && tier.id === homeTierId;
                // Cost to move into this tier: price − proceeds from selling current.
                const net = tier.price - sellProceeds;
                const canAfford = capital >= net; // net may be negative (gain)
                return (
                  <div
                    key={tier.id}
                    className={cn(
                      'rounded-lg border p-3 flex items-center gap-3',
                      isCurrent
                        ? 'border-accent/40 bg-emerald-400/5'
                        : 'border-line bg-panel2/60',
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-ink flex items-center gap-2">
                        {tier.name}
                        {isCurrent && (
                          <span className="text-[10px] uppercase tracking-wider text-accent">Now</span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted mt-0.5 leading-snug">{tier.description}</div>
                      <div className="text-[11px] text-muted mt-1">
                        <span className="num text-ink">{moneyFull(tier.price)}</span>
                        {' · '}
                        Upkeep <span className="num text-ink">{money(tier.monthlyExpense)}</span>/mo
                        {' · '}
                        <span className="num text-ink">{(tier.appreciationYearly * 100).toFixed(1)}%</span>/yr
                      </div>
                    </div>
                    {!isCurrent && (
                      <div className="text-right">
                        <div className={cn('num text-[11px]', net > 0 ? 'text-bad' : 'text-accent')}>
                          {net > 0 ? `Pay ${money(net)}` : `+${money(-net)}`}
                        </div>
                        <button
                          onClick={() => upgradeHome(tier.id)}
                          disabled={!canAfford}
                          className={cn(
                            'mt-1 h-7 px-3 rounded-md text-[11px] font-semibold transition-colors',
                            canAfford
                              ? 'bg-accent text-black hover:bg-emerald-300'
                              : 'bg-line text-muted cursor-not-allowed',
                          )}
                        >
                          {hasHome ? 'Move in' : 'Buy'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="px-4 py-3 border-t border-line flex items-center gap-2">
              <button
                onClick={onClose}
                className="h-8 flex-1 rounded-md text-xs font-semibold border border-line text-muted hover:text-ink hover:border-ink/40 transition-colors"
              >
                Close
              </button>
              {hasHome && (
                <button
                  onClick={() => {
                    sellHome();
                    onClose();
                  }}
                  className="h-8 px-3 rounded-md text-xs font-semibold border border-bad/30 text-bad hover:bg-bad/10 transition-colors"
                >
                  Sell · rent
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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
