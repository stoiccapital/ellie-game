import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../store';
import { JOB_LEVELS } from '../catalog';
import { money, moneyFull } from '../lib/format';

export function Career() {
  const open = useGame((s) => s.careerModalOpen);
  const setOpen = useGame((s) => s.setCareerModalOpen);
  const jobLevel = useGame((s) => s.jobLevel);
  const capital = useGame((s) => s.capital);
  const upgradeJob = useGame((s) => s.upgradeJob);

  const current = JOB_LEVELS[Math.min(jobLevel, JOB_LEVELS.length - 1)];
  const next = JOB_LEVELS[jobLevel + 1];
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
            className="w-[380px] max-w-[90vw] max-h-[85vh] rounded-xl border border-line bg-panel shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="px-4 pt-4 pb-3 border-b border-line">
              <div className="text-sm font-semibold text-ink">Career</div>
              <div className="text-[11px] text-muted mt-0.5">
                Current role · <span className="text-ink">{current.title}</span> ·{' '}
                <span className="num text-ink">{moneyFull(current.salary)}</span> /mo
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {JOB_LEVELS.map((lvl, i) => {
                const isCurrent = i === jobLevel;
                const isUnlocked = i <= jobLevel;
                const isNext = i === jobLevel + 1;
                const canAfford = capital >= lvl.upgradeCost;
                return (
                  <div
                    key={lvl.title}
                    className={`rounded-lg border p-3 flex items-center gap-3 ${
                      isCurrent
                        ? 'border-accent/40 bg-emerald-400/5'
                        : isUnlocked
                        ? 'border-line bg-panel2/60'
                        : 'border-line bg-panel2'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold ${
                      isCurrent ? 'bg-accent text-black' : isUnlocked ? 'bg-line text-ink' : 'bg-line text-muted'
                    }`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-ink">{lvl.title}</div>
                      <div className="text-[11px] text-muted">
                        <span className="num text-ink">{money(lvl.salary)}</span> /mo
                        {i > 0 && (
                          <>
                            {' · '}
                            Training <span className="num text-ink">{money(lvl.upgradeCost)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {isNext && (
                      <button
                        onClick={() => upgradeJob()}
                        disabled={!canAfford}
                        className={`h-8 px-3 rounded-md text-[11px] font-semibold transition-colors ${
                          canAfford
                            ? 'bg-accent text-black hover:bg-emerald-300'
                            : 'bg-line text-muted cursor-not-allowed'
                        }`}
                      >
                        {canAfford ? 'Promote' : 'Short'}
                      </button>
                    )}
                    {isCurrent && (
                      <div className="text-[10px] uppercase tracking-wider text-accent">Now</div>
                    )}
                  </div>
                );
              })}
              {!next && (
                <div className="text-center text-[11px] text-muted py-2">You've reached the top.</div>
              )}
            </div>

            <div className="px-4 py-3 border-t border-line flex justify-end">
              <button
                onClick={onClose}
                className="h-8 px-4 rounded-md text-xs font-semibold border border-line text-muted hover:text-ink hover:border-ink/40 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
