import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../store';
import { CATALOG, MAX_LTV, MORTGAGE_RATE_YEARLY } from '../catalog';
import { money, moneyFull } from '../lib/format';

export function Bank() {
  const open = useGame((s) => s.bankModalOpen);
  const setOpen = useGame((s) => s.setBankModalOpen);
  const capital = useGame((s) => s.capital);
  const debt = useGame((s) => s.debt);
  const owned = useGame((s) => s.owned);
  const homeValue = useGame((s) => s.homeValue);
  const borrow = useGame((s) => s.borrow);
  const repay = useGame((s) => s.repay);

  const onClose = () => setOpen(false);

  const [tab, setTab] = useState<'borrow' | 'repay'>('borrow');
  const [amountStr, setAmountStr] = useState('');

  const assetValue = owned.reduce((a, b) => {
    const def = CATALOG.find((d) => d.id === b.defId);
    return def ? a + b.currentValue : a;
  }, 0);
  const collateral = homeValue + assetValue;
  const creditLimit = collateral * MAX_LTV;
  const available = Math.max(0, creditLimit - debt);
  const monthlyInterest = debt * (Math.pow(1 + MORTGAGE_RATE_YEARLY, 1 / 12) - 1);

  const amount = Math.max(0, Math.floor(Number(amountStr) || 0));
  const canBorrow = tab === 'borrow' && amount > 0 && amount <= available;
  const canRepay = tab === 'repay' && amount > 0 && amount <= Math.min(debt, Math.max(0, capital));

  const submit = () => {
    const ok = tab === 'borrow' ? borrow(amount) : repay(amount);
    if (ok) {
      setAmountStr('');
      onClose();
    }
  };

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
              <div className="text-sm font-semibold text-ink">Bank</div>
              <div className="text-[11px] text-muted mt-0.5">
                Interest-only loan at{' '}
                <span className="num text-ink">{(MORTGAGE_RATE_YEARLY * 100).toFixed(1)}%</span> /yr,
                secured against your home and assets.
              </div>
            </div>

            <div className="px-4 py-3 text-xs space-y-1.5">
              <Row label="Current debt" value={moneyFull(debt)} tone={debt > 0 ? 'bad' : 'muted'} />
              <Row label="Monthly interest" value={`${money(monthlyInterest)} /mo`} tone={debt > 0 ? 'bad' : 'muted'} />
              <Row label="Collateral" value={moneyFull(collateral)} tone="muted" />
              <Row label={`Credit limit (${Math.round(MAX_LTV * 100)}% LTV)`} value={moneyFull(creditLimit)} tone="muted" />
              <Row label="Available to borrow" value={moneyFull(available)} tone="accent" />
            </div>

            <div className="px-4 flex items-center gap-1">
              <TabBtn active={tab === 'borrow'} onClick={() => setTab('borrow')}>Borrow</TabBtn>
              <TabBtn active={tab === 'repay'} onClick={() => setTab('repay')}>Repay</TabBtn>
            </div>

            <div className="px-4 pt-3 pb-4 space-y-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted mb-1">Amount</div>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="0"
                  className="w-full h-9 px-3 rounded-md bg-panel2 border border-line text-sm num text-ink focus:outline-none focus:border-ink/40"
                />
                <div className="flex items-center gap-1 mt-2">
                  {[0.25, 0.5, 1].map((frac) => {
                    const cap = tab === 'borrow' ? available : Math.min(debt, Math.max(0, capital));
                    const quick = Math.floor(cap * frac);
                    return (
                      <button
                        key={frac}
                        onClick={() => setAmountStr(String(quick))}
                        className="h-7 px-2 rounded-md text-[11px] font-semibold border border-line text-muted hover:text-ink hover:border-ink/40 transition-colors"
                      >
                        {frac === 1 ? 'Max' : `${Math.round(frac * 100)}%`}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="h-9 flex-1 rounded-md text-xs font-semibold border border-line text-muted hover:text-ink hover:border-ink/40 transition-colors"
                >
                  Close
                </button>
                <button
                  disabled={tab === 'borrow' ? !canBorrow : !canRepay}
                  onClick={submit}
                  className={`h-9 flex-1 rounded-md text-xs font-semibold transition-colors ${
                    (tab === 'borrow' ? canBorrow : canRepay)
                      ? 'bg-accent text-black hover:bg-emerald-300'
                      : 'bg-line text-muted cursor-not-allowed'
                  }`}
                >
                  {tab === 'borrow' ? `Borrow ${amount > 0 ? money(amount) : ''}` : `Repay ${amount > 0 ? money(amount) : ''}`}
                </button>
              </div>
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

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`h-8 px-3 rounded-md text-xs font-semibold transition-colors ${
        active ? 'bg-panel2 border border-ink/30 text-ink' : 'border border-transparent text-muted hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}
