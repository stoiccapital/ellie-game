import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '../store';
import { money, moneyFull, timeStamp } from '../lib/format';
import { CATALOG, JOB_SALARY, LIVING_EXPENSE, MORTGAGE_RATE_YEARLY, RENT_MONTHLY, STARTING_AGE } from '../catalog';
import { SpeedControl } from './SpeedControl';

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

  const { cashflow, assetValue } = useMemo(() => {
    let cf = JOB_SALARY - LIVING_EXPENSE;
    let v = 0;
    for (const a of owned) {
      const def = CATALOG.find((d) => d.id === a.defId)!;
      cf += def.monthlyIncome - def.monthlyExpense;
      v += a.currentValue;
    }
    return { cashflow: cf, assetValue: v };
  }, [owned]);

  const monthlyInterest = debt * (Math.pow(1 + MORTGAGE_RATE_YEARLY, 1 / 12) - 1);
  const rentCost = hasHome ? 0 : RENT_MONTHLY;
  const netCashflow = cashflow - monthlyInterest - rentCost;
  const netWorth = capital + homeValue + assetValue - debt;
  const ts = timeStamp(month);
  const age = STARTING_AGE + Math.floor(month / 12);

  return (
    <div className="flex items-center gap-3 px-5 h-16 border-b border-line bg-panel/80 backdrop-blur">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-md bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-black font-bold text-sm">E</div>
        <div className="text-sm font-semibold tracking-tight">Ellie Money House</div>
      </div>

      <div className="h-8 w-px bg-line mx-2" />

      <Metric label="Capital" value={moneyFull(capital)} tone={capital < 0 ? 'bad' : 'ink'} big />
      <Metric label="Cashflow" value={`${netCashflow >= 0 ? '+' : ''}${money(netCashflow)} /mo`} tone={netCashflow >= 0 ? 'accent' : 'bad'} />
      <Metric label="Salary" value={`+${money(JOB_SALARY)} /mo`} tone="muted" />
      <Metric label="Net Worth" value={money(netWorth)} tone="ink" />
      <Metric label="Assets" value={money(assetValue)} tone="muted" />
      <button
        onClick={() => setHomeOpen(true)}
        className="px-3 min-w-[6rem] text-left hover:bg-panel2/60 rounded-md transition-colors"
      >
        <div className="text-[10px] uppercase tracking-wider text-muted">Home</div>
        <div className={`num font-semibold text-sm ${hasHome ? 'text-ink' : 'text-bad'}`}>
          {hasHome ? money(homeValue) : 'Renting'}
        </div>
      </button>
      <Metric label="Debt" value={money(debt)} tone={debt > 0 ? 'bad' : 'muted'} />
      <Metric label="Peak NW" value={money(peak)} tone="muted" />

      <div className="ml-auto flex items-center gap-3">
        <button
          onClick={() => setBankOpen(true)}
          className="h-9 px-3 rounded-md text-xs font-semibold border border-line text-ink hover:border-ink/40 transition-colors"
        >
          Bank
        </button>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-muted">Age</div>
          <AnimatePresence mode="popLayout">
            <motion.div
              key={age}
              initial={{ y: -4, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 4, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="num text-sm font-semibold"
            >
              {age}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-muted">Time</div>
          <AnimatePresence mode="popLayout">
            <motion.div
              key={ts.label}
              initial={{ y: -4, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 4, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="num text-sm font-semibold"
            >
              {ts.label}
            </motion.div>
          </AnimatePresence>
        </div>
        <SpeedControl />
      </div>
    </div>
  );
}

function Metric({ label, value, tone, big }: { label: string; value: string; tone: 'ink' | 'accent' | 'bad' | 'muted'; big?: boolean }) {
  const toneClass = {
    ink: 'text-ink',
    accent: 'text-accent',
    bad: 'text-bad',
    muted: 'text-muted',
  }[tone];
  return (
    <div className="px-3 min-w-[6rem]">
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
      <div className={`num font-semibold ${big ? 'text-base' : 'text-sm'} ${toneClass}`}>{value}</div>
    </div>
  );
}
