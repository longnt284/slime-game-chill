import { useEffect, useRef, useState } from "react";
import { Engine } from "./game/engine";
import type { HudData, OverData, Phase } from "./game/engine";
import { heroSkinById, weaponSkinById, loadSave, saveSave } from "./game/shop";
import type { SaveData } from "./game/shop";
import { sfx } from "./game/audio";
import {
  Banner,
  GameOverScreen,
  HUD,
  IS_TOUCH,
  LevelUpScreen,
  MenuScreen,
  PauseScreen,
  ShopScreen,
  StageClearScreen,
  TouchControls,
  VictoryScreen,
} from "./ui/screens";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engRef = useRef<Engine | null>(null);
  const [phase, setPhase] = useState<Phase>("menu");
  const [hud, setHud] = useState<HudData | null>(null);
  const [over, setOver] = useState<OverData>({});
  const [shopOpen, setShopOpen] = useState(false);
  const [save, setSave] = useState<SaveData>(() => loadSave());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = loadSave();
    const eng = new Engine(canvas, {
      onPhase: (p, d) => {
        setPhase(p);
        if (d) setOver(d);
      },
      onHud: setHud,
    });
    eng.applyLoadout(heroSkinById(s.hero), weaponSkinById(s.weapon));
    engRef.current = eng;
    return () => {
      eng.destroy();
      engRef.current = null;
    };
  }, []);

  // cộng vàng vào ví mỗi khi qua màn / thua / thắng
  useEffect(() => {
    const earned = over.stats?.goldEarned ?? 0;
    if ((phase === "stageclear" || phase === "gameover" || phase === "victory") && earned > 0) {
      setSave((s) => {
        const ns = { ...s, gold: s.gold + earned };
        saveSave(ns);
        return ns;
      });
    }
  }, [phase, over]);

  const applySave = (s: SaveData) => {
    setSave(s);
    saveSave(s);
    engRef.current?.applyLoadout(heroSkinById(s.hero), weaponSkinById(s.weapon));
  };

  const handleBuy = (kind: "hero" | "weapon", id: string, price: number) => {
    if (save.gold < price) return;
    const s: SaveData = { ...save, gold: save.gold - price };
    if (kind === "hero") {
      s.heroOwned = [...save.heroOwned, id];
      s.hero = id;
    } else {
      s.weaponOwned = [...save.weaponOwned, id];
      s.weapon = id;
    }
    applySave(s);
    sfx.core();
  };

  const handleEquip = (kind: "hero" | "weapon", id: string) => {
    applySave(kind === "hero" ? { ...save, hero: id } : { ...save, weapon: id });
    sfx.click();
  };

  const inGame = phase === "playing" || phase === "paused" || phase === "levelup" || phase === "stageclear";

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#14100a]">
      <canvas ref={canvasRef} className="absolute inset-0" style={{ imageRendering: "pixelated" }} />

      {hud && inGame && (
        <HUD
          hud={hud}
          onPause={() => engRef.current?.togglePause()}
          onMute={() => engRef.current?.toggleMute()}
          touch={IS_TOUCH}
        />
      )}

      {hud?.banner && phase === "playing" && <Banner banner={hud.banner} />}

      {phase === "playing" && IS_TOUCH && (
        <TouchControls
          onMove={(x, y) => engRef.current?.setJoystick(x, y)}
          onPause={() => engRef.current?.togglePause()}
          onMute={() => engRef.current?.toggleMute()}
          muted={hud?.muted ?? false}
        />
      )}

      {phase === "menu" && !shopOpen && (
        <MenuScreen onStart={() => engRef.current?.start()} onShop={() => setShopOpen(true)} gold={save.gold} />
      )}

      {shopOpen && (
        <ShopScreen
          gold={save.gold}
          save={save}
          onBuy={handleBuy}
          onEquip={handleEquip}
          onClose={() => setShopOpen(false)}
        />
      )}

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
