import { useEffect } from 'react';
import { useGame } from './store';
import { HUD } from './components/HUD';
import { Scene } from './components/Scene';
import { Marketplace } from './components/Marketplace';
import { Portfolio } from './components/Portfolio';
import { GameOver } from './components/GameOver';
import { Home } from './components/Home';
import { Bank } from './components/Bank';

export default function App() {
  const speed = useGame((s) => s.speed);
  const tick = useGame((s) => s.tick);

  useEffect(() => {
    if (speed === 0) return;
    const intervalMs = 1000 / speed;
    const id = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(id);
  }, [speed, tick]);

  return (
    <div className="relative h-screen w-screen flex flex-col text-ink">
      <HUD />
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 min-w-0 relative">
          <Scene />
        </div>
        <aside className="w-[360px] flex-shrink-0 border-l border-line bg-panel/60 flex flex-col min-h-0">
          <div className="flex-1 min-h-0 border-b border-line">
            <Marketplace />
          </div>
          <div className="h-[42%] min-h-[220px]">
            <Portfolio />
          </div>
        </aside>
      </div>
      <GameOver />
      <Home />
      <Bank />
    </div>
  );
}
