import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '../store';
import { money, moneyFull, timeStamp } from '../lib/format';
import { CATALOG, CAREER_TRACKS, LIVING_EXPENSE, MORTGAGE_PAYMENT_FACTOR_MONTHLY, RENT_MONTHLY, STARTING_AGE } from '../catalog';
import { SpeedControl } from './SpeedControl';

type Tone = 'ink' | 'accent' | 'bad' | 'muted';

export function HUD() {
  const capital = useGame((s) => s.capital);
  const owned = useGame((s) => s.owned);
  const homeValue = useGame((s) => s.homeValue);
  const month = useGame((s) => s.month);
  const peak = useGame((s) => s.peakNetWorth);
  const debt = useGame((s) => s.debt);
  const hasHome = useGame((s) => s.hasHome);
  const setHomeOpen = useGame((s) => s.setHomeModalOpen);
  const setBankOpen = useGame((s) => s.setBankModalOpen);
  const setCareerOpen = useGame((s) => s.setCareerModalOpen);
  const jobLevel = useGame((s) => s.jobLevel);
  const careerTrackId = useGame((s) => s.careerTrackId);
  const reset = useGame((s) => s.reset);
  const track = CAREER_TRACKS.find((t) => t.id === careerTrackId) ?? CAREER_TRACKS[0];
  const job = track.levels[Math.min(jobLevel, track.levels.length - 1)];

  const { cashflow, assetValue } = useMemo(() => {
    let cf = job.salary - LIVING_EXPENSE;
    let v = 0;
    for (const a of owned) {
      const def = CATALOG.find((d) => d.id === a.defId)!;
      const units = a.units ?? 1;
      if (def.category === 'etf') {
        const yieldPerDollar = def.monthlyIncome / def.price;
        cf += a.currentValue * yieldPerDollar - def.monthlyExpense * units;
      } else {
        cf += (def.monthlyIncome - def.monthlyExpense) * units;
      }
      v += a.currentValue * units;
    }
    return { cashflow: cf, assetValue: v };
  }, [owned, job.salary]);

  const mortgagePayment = debt * MORTGAGE_PAYMENT_FACTOR_MONTHLY;
  const rentCost = hasHome ? 0 : RENT_MONTHLY;
  const netCashflow = cashflow - mortgagePayment - rentCost;
  const netWorth = capital + homeValue + assetValue - debt;
  const ts = timeStamp(month);
  const age = STARTING_AGE + Math.floor(month / 12);

  return (
    <div className="border-b border-line bg-panel/80 backdrop-blur">
      {/* Row 1 — brand, primary stats, time & controls */}
      <div className="flex items-center gap-5 px-5 h-14">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-black font-bold text-sm">E</div>
          <div className="text-sm font-semibold tracking-tight">Ellie Money House</div>
        </div>

        <Divider />

        <PrimaryStat label="Capital" value={moneyFull(capital)} tone={capital < 0 ? 'bad' : 'ink'} />
        <PrimaryStat label="Net Worth" value={moneyFull(netWorth)} tone={netWorth >= 0 ? 'ink' : 'bad'} />
        <PrimaryStat
          label="Cashflow"
          value={`${netCashflow >= 0 ? '+' : ''}${money(netCashflow)} /mo`}
          tone={netCashflow >= 0 ? 'accent' : 'bad'}
        />

        <div className="ml-auto flex items-center gap-5">
          <TickDisplay label="Age" value={String(age)} />
          <TickDisplay label="Time" value={ts.label} />
          <SpeedControl />
        </div>
      </div>

      {/* Row 2 — clickable account chips, secondary stats, action buttons */}
      <div className="flex items-center gap-2 px-5 h-11 border-t border-line/60">
        <Chip
          label={`${job.title} · ${track.company}`}
          value={`+${money(job.salary)} /mo`}
          tone="muted"
          onClick={() => setCareerOpen(true)}
        />
        <Chip
          label="Home"
          value={hasHome ? money(homeValue) : 'Renting'}
          tone={hasHome ? 'ink' : 'bad'}
          onClick={() => setHomeOpen(true)}
        />
        <Chip
          label="Debt"
          value={money(debt)}
          tone={debt > 0 ? 'bad' : 'muted'}
          onClick={() => setBankOpen(true)}
        />

        <Divider />

        <SecondaryStat label="Assets" value={money(assetValue)} />
        <SecondaryStat label="Peak NW" value={money(peak)} />

        <div className="ml-auto flex items-center gap-2">
          <ActionButton onClick={() => setBankOpen(true)} tone="ink">
            Bank
          </ActionButton>
          <ActionButton
            onClick={() => {
              if (window.confirm('Reset the game? All progress will be lost.')) reset();
            }}
            tone="danger"
          >
            Reset
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="h-7 w-px bg-line" />;
}

function PrimaryStat({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  return (
    <div className="min-w-[7rem]">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted">{label}</div>
      <div className={`num font-semibold text-[15px] leading-tight ${toneClass(tone)}`}>{value}</div>
    </div>
  );
}

function SecondaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2.5 flex items-baseline gap-1.5">
      <span className="text-[10px] uppercase tracking-wider text-muted">{label}</span>
      <span className="num font-semibold text-xs text-ink">{value}</span>
    </div>
  );
}

function Chip({
  label,
  value,
  tone,
  onClick,
}: {
  label: string;
  value: string;
  tone: Tone;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="h-8 px-3 flex items-center gap-2 rounded-md border border-line bg-panel2/40 hover:bg-panel2 hover:border-ink/30 transition-colors"
    >
      <span className="text-[10px] uppercase tracking-wider text-muted">{label}</span>
      <span className={`num font-semibold text-xs ${toneClass(tone)}`}>{value}</span>
    </button>
  );
}

function ActionButton({
  onClick,
  tone,
  children,
}: {
  onClick: () => void;
  tone: 'ink' | 'danger';
  children: React.ReactNode;
}) {
  const style =
    tone === 'ink'
      ? 'border-line text-ink hover:border-ink/40'
      : 'border-line text-muted hover:text-bad hover:border-bad/40';
  return (
    <button
      onClick={onClick}
      className={`h-8 px-3 rounded-md text-xs font-semibold border transition-colors ${style}`}
    >
      {children}
    </button>
  );
}

function TickDisplay({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted">{label}</div>
      <AnimatePresence mode="popLayout">
        <motion.div
          key={value}
          initial={{ y: -4, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 4, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="num text-[13px] font-semibold leading-tight"
        >
          {value}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function toneClass(tone: Tone): string {
  return { ink: 'text-ink', accent: 'text-accent', bad: 'text-bad', muted: 'text-muted' }[tone];
}
