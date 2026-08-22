import { useEffect, useRef, useState } from "react";
import { Engine } from "./game/engine";
import type { HudData, OverData, Phase } from "./game/engine";
import {
  Banner,
  GameOverScreen,
  HUD,
  LevelUpScreen,
  MenuScreen,
  PauseScreen,
  StageClearScreen,
  VictoryScreen,
} from "./ui/screens";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engRef = useRef<Engine | null>(null);
  const [phase, setPhase] = useState<Phase>("menu");
  const [hud, setHud] = useState<HudData | null>(null);
  const [over, setOver] = useState<OverData>({});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const eng = new Engine(canvas, {
      onPhase: (p, d) => {
        setPhase(p);
        if (d) setOver(d);
      },
      onHud: setHud,
    });
    engRef.current = eng;
    return () => {
      eng.destroy();
      engRef.current = null;
    };
  }, []);

  const inGame = phase === "playing" || phase === "paused" || phase === "levelup" || phase === "stageclear";

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#14100a]">
      <canvas ref={canvasRef} className="absolute inset-0" style={{ imageRendering: "pixelated" }} />

      {hud && inGame && <HUD hud={hud} onPause={() => engRef.current?.togglePause()} onMute={() => engRef.current?.toggleMute()} />}

      {hud?.banner && phase === "playing" && <Banner banner={hud.banner} />}

      {phase === "menu" && <MenuScreen onStart={() => engRef.current?.start()} />}

      {phase === "paused" && (
        <PauseScreen
          onResume={() => engRef.current?.resume()}
          onRestart={() => engRef.current?.start()}
          onMenu={() => engRef.current?.toMenu()}
        />
      )}

      {phase === "levelup" && over.choices && (
        <LevelUpScreen hud={hud} choices={over.choices} onPick={(i) => engRef.current?.choose(i)} />
      )}

      {phase === "stageclear" && over.stats && <StageClearScreen stats={over.stats} onNext={() => engRef.current?.nextStage()} />}

      {phase === "gameover" && over.stats && (
        <GameOverScreen stats={over.stats} onRetry={() => engRef.current?.start()} onMenu={() => engRef.current?.toMenu()} />
      )}

      {phase === "victory" && over.stats && (
        <VictoryScreen stats={over.stats} onRetry={() => engRef.current?.start()} onMenu={() => engRef.current?.toMenu()} />
      )}
    </div>
  );
}
