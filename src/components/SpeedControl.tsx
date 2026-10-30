import { Pause, Play, FastForward } from 'lucide-react';
import { useGame } from '../store';
import { cn } from '../lib/cn';
import type { Speed } from '../types';

export function SpeedControl() {
  const speed = useGame((s) => s.speed);
  const setSpeed = useGame((s) => s.setSpeed);
  const gameOver = useGame((s) => s.gameOver);

  const btn = (s: Speed, Icon: typeof Pause, label: string) => (
    <button
      key={label}
      disabled={gameOver}
      onClick={() => setSpeed(s)}
      className={cn(
        'h-9 px-3 flex items-center gap-1.5 rounded-md border transition-colors text-xs font-medium',
        speed === s
          ? 'border-emerald-400/40 bg-emerald-400/10 text-accent'
          : 'border-line bg-panel2 text-muted hover:text-ink hover:border-line/80',
        gameOver && 'opacity-40 cursor-not-allowed',
      )}
    >
      <Icon size={14} strokeWidth={2.4} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex items-center gap-1.5 p-1 rounded-lg border border-line bg-panel2">
      {btn(0, Pause, 'Pause')}
      {btn(1, Play, '1x')}
      {btn(10, FastForward, '10x')}
    </div>
  );
}
