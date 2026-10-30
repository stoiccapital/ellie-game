import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../store';
import { HOME_APPRECIATION_YEARLY, RENT_MONTHLY } from '../catalog';
import { money, moneyFull } from '../lib/format';

export function Home() {
  const open = useGame((s) => s.homeModalOpen);
  const setOpen = useGame((s) => s.setHomeModalOpen);
  const hasHome = useGame((s) => s.hasHome);
  const homeValue = useGame((s) => s.homeValue);
  const debt = useGame((s) => s.debt);
  const sellHome = useGame((s) => s.sellHome);

  const onClose = () => setOpen(false);

  const payoff = Math.min(debt, homeValue);
  const proceeds = Math.max(0, homeValue - payoff);

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
            className="w-[360px] max-w-[90vw] rounded-xl border border-line bg-panel shadow-2xl overflow-hidden"
          >
            <div className="px-4 pt-4 pb-3 border-b border-line">
              <div className="text-sm font-semibold text-ink">
                {hasHome ? "Ellie's House" : 'Renting'}
              </div>
              <div className="text-[11px] text-muted mt-0.5">
                {hasHome
                  ? `Primary residence. Appreciates ${(HOME_APPRECIATION_YEARLY * 100).toFixed(1)}% /yr.`
                  : `Monthly rent: ${money(RENT_MONTHLY)}. No home appreciation.`}
              </div>
            </div>

            {hasHome ? (
              <>
                <div className="px-4 py-3 text-xs space-y-1.5">
                  <Row label="Home value" value={moneyFull(homeValue)} tone="ink" />
                  <Row label="Mortgage payoff" value={moneyFull(payoff)} tone={payoff > 0 ? 'bad' : 'muted'} />
                  <Row label="Cash from sale" value={moneyFull(proceeds)} tone="accent" />
                  <Row label="Rent after sale" value={`${money(RENT_MONTHLY)} /mo`} tone="muted" />
                </div>
                <div className="px-4 pb-4 flex items-center gap-2">
                  <button
                    onClick={onClose}
                    className="h-9 flex-1 rounded-md text-xs font-semibold border border-line text-muted hover:text-ink hover:border-ink/40 transition-colors"
                  >
                    Keep
                  </button>
                  <button
                    onClick={() => {
                      sellHome();
                      onClose();
                    }}
                    className="h-9 flex-1 rounded-md text-xs font-semibold bg-accent text-black hover:bg-emerald-300 transition-colors"
                  >
                    Sell · {money(proceeds)}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="px-4 py-3 text-xs space-y-1.5">
                  <Row label="Rent" value={`${money(RENT_MONTHLY)} /mo`} tone="bad" />
                  <Row label="Home equity" value={moneyFull(0)} tone="muted" />
                </div>
                <div className="px-4 pb-4">
                  <button
                    onClick={onClose}
                    className="h-9 w-full rounded-md text-xs font-semibold border border-line text-muted hover:text-ink hover:border-ink/40 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
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
