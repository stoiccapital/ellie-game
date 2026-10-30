import { motion } from 'framer-motion';
import { useGame } from '../store';
import { money, timeStamp } from '../lib/format';

export function GameOver() {
  const gameOver = useGame((s) => s.gameOver);
  const peak = useGame((s) => s.peakNetWorth);
  const month = useGame((s) => s.month);
  const reset = useGame((s) => s.reset);

  if (!gameOver) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="w-[380px] p-6 rounded-xl border border-line bg-panel"
      >
        <div className="text-xs uppercase tracking-wider text-bad">Bankrupt</div>
        <div className="text-2xl font-semibold mt-1">The money ran out.</div>
        <div className="mt-5 space-y-3 text-sm">
          <Row label="Lasted" value={timeStamp(month).label} />
          <Row label="Peak Net Worth" value={money(peak)} tone="accent" />
        </div>
        <button
          onClick={reset}
          className="mt-6 w-full h-10 rounded-md bg-accent text-black font-semibold hover:bg-emerald-300 transition-colors"
        >
          Start Over
        </button>
      </motion.div>
    </motion.div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'accent' }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className={`num font-semibold ${tone === 'accent' ? 'text-accent' : 'text-ink'}`}>{value}</span>
    </div>
  );
}
