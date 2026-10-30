import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../store';
import { CAREER_TRACKS } from '../catalog';
import { money, moneyFull } from '../lib/format';
import { cn } from '../lib/cn';

export function Career() {
  const open = useGame((s) => s.careerModalOpen);
  const setOpen = useGame((s) => s.setCareerModalOpen);
  const jobLevel = useGame((s) => s.jobLevel);
  const jobLevelSinceMonth = useGame((s) => s.jobLevelSinceMonth);
  const careerTrackId = useGame((s) => s.careerTrackId);
  const month = useGame((s) => s.month);
  const capital = useGame((s) => s.capital);
  const upgradeJob = useGame((s) => s.upgradeJob);
  const switchCareer = useGame((s) => s.switchCareer);

  const track = CAREER_TRACKS.find((t) => t.id === careerTrackId) ?? CAREER_TRACKS[0];
  const current = track.levels[Math.min(jobLevel, track.levels.length - 1)];
  const next = track.levels[jobLevel + 1];
  const monthsAtLevel = Math.max(0, month - jobLevelSinceMonth);
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
            className="w-[460px] max-w-[94vw] max-h-[88vh] rounded-xl border border-line bg-panel shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="px-4 pt-4 pb-3 border-b border-line">
              <div className="text-sm font-semibold text-ink">Career</div>
              <div className="text-[11px] text-muted mt-0.5">
                {current.title} @ <span className="text-ink">{track.company}</span> ·{' '}
                <span className="num text-ink">{moneyFull(current.salary)}</span> /mo ·{' '}
                <span className="num text-ink">{monthsAtLevel}</span> mo tenure
              </div>
            </div>

            {/* Track picker */}
            <div className="px-4 pt-3 pb-2 border-b border-line/60">
              <div className="text-[10px] uppercase tracking-wider text-muted mb-2">Corporation</div>
              <div className="grid grid-cols-2 gap-2">
                {CAREER_TRACKS.map((t) => {
                  const active = t.id === careerTrackId;
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        if (active) return;
                        if (window.confirm(
                          `Switch to ${t.company}? You'll start over as ${t.levels[0].title} and restart the tenure clock.`,
                        )) {
                          switchCareer(t.id);
                        }
                      }}
                      className={cn(
                        'rounded-md border p-2 text-left transition-colors',
                        active
                          ? 'border-accent/40 bg-emerald-400/5'
                          : 'border-line bg-panel2/60 hover:border-ink/30',
                      )}
                    >
                      <div
                        className="text-[10px] uppercase tracking-wider"
                        style={{ color: t.color }}
                      >
                        {t.name}
                      </div>
                      <div className="text-xs font-semibold text-ink leading-tight mt-0.5">
                        {t.company}
                      </div>
                      <div className="text-[10px] text-muted mt-1 leading-snug">{t.tagline}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ladder */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-muted">Ladder · {track.company}</div>
              {track.levels.map((lvl, i) => {
                const isCurrent = i === jobLevel;
                const isUnlocked = i <= jobLevel;
                const isNext = i === jobLevel + 1;
                const tenureOk = monthsAtLevel >= lvl.tenureRequired;
                const canAfford = capital >= lvl.upgradeCost;
                const canPromote = isNext && tenureOk && canAfford;
                return (
                  <div
                    key={lvl.title}
                    className={cn(
                      'rounded-lg border p-3 flex items-center gap-3',
                      isCurrent
                        ? 'border-accent/40 bg-emerald-400/5'
                        : isUnlocked
                        ? 'border-line bg-panel2/60'
                        : 'border-line bg-panel2',
                    )}
                  >
                    <div
                      className={cn(
                        'w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold',
                        isCurrent ? 'bg-accent text-black' : isUnlocked ? 'bg-line text-ink' : 'bg-line text-muted',
                      )}
                    >
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
                            {' · '}
                            Tenure <span className="num text-ink">{lvl.tenureRequired}</span> mo
                          </>
                        )}
                      </div>
                      {isNext && !tenureOk && (
                        <div className="text-[10px] text-warn mt-1">
                          Needs <span className="num">{lvl.tenureRequired - monthsAtLevel}</span> more mo in role
                        </div>
                      )}
                    </div>
                    {isNext && (
                      <button
                        onClick={() => upgradeJob()}
                        disabled={!canPromote}
                        className={cn(
                          'h-8 px-3 rounded-md text-[11px] font-semibold transition-colors',
                          canPromote
                            ? 'bg-accent text-black hover:bg-emerald-300'
                            : 'bg-line text-muted cursor-not-allowed',
                        )}
                      >
                        {!tenureOk ? 'Too soon' : !canAfford ? 'Short' : 'Promote'}
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
