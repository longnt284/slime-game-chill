import { useCallback, useEffect, useRef, useState } from "react";
import { Engine } from "./game/engine";
import type { HudData, OverData, Phase } from "./game/engine";
import {
  heroSkinById,
  loadSave,
  metaStatsOf,
  saveSave,
  upgradeCost,
  upgradeDef,
  weaponSkinById,
} from "./game/shop";
import type { SaveData, UpgradeId } from "./game/shop";
import { applyTally, claimQuest, dayKey, questsForDay } from "./game/quests";
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
  const [day, setDay] = useState(() => dayKey());
  const [save, setSave] = useState<SaveData>(() => {
    // Sang ngày mới thì dọn tiến độ nhiệm vụ ngay từ lúc mở game.
    const loaded = loadSave();
    return { ...loaded, quests: questsForDay(loaded.quests, dayKey()) };
  });
  // Mỗi lần chốt sổ có mã riêng; giữ lại mã đã xử lý để không cộng thưởng hai lần
  // khi React chạy lại effect với cùng một kết quả.
  const settledRef = useRef(-1);

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
    eng.applyLoadout(heroSkinById(s.hero), weaponSkinById(s.weapon), metaStatsOf(s));
    engRef.current = eng;
    return () => {
      eng.destroy();
      engRef.current = null;
    };
  }, []);

  // Người chơi để game mở qua nửa đêm thì bộ nhiệm vụ vẫn phải đổi sang ngày mới.
  useEffect(() => {
    const timer = window.setInterval(() => setDay(dayKey()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setSave((s) => (s.quests.day === day ? s : { ...s, quests: questsForDay(s.quests, day) }));
  }, [day]);

  // Chốt sổ sau mỗi màn đã qua và khi kết thúc trận: cộng vàng và tiến độ nhiệm vụ.
  useEffect(() => {
    const stats = over.stats;
    if (!stats) return;
    if (phase !== "stageclear" && phase !== "gameover" && phase !== "victory") return;
    if (settledRef.current === stats.id) return;
    settledRef.current = stats.id;
    setSave((s) => {
      const next: SaveData = {
        ...s,
        gold: s.gold + Math.max(0, stats.goldEarned),
        quests: applyTally(s.quests, day, stats.tally),
      };
      saveSave(next);
      return next;
    });
  }, [phase, over, day]);

  const applySave = (s: SaveData) => {
    setSave(s);
    saveSave(s);
    engRef.current?.applyLoadout(heroSkinById(s.hero), weaponSkinById(s.weapon), metaStatsOf(s));
  };

  const handleMove = useCallback((x: number, y: number) => {
    engRef.current?.setJoystick(x, y);
  }, []);
  const handlePause = useCallback(() => {
    engRef.current?.togglePause();
  }, []);
  const handleMute = useCallback(() => {
    engRef.current?.toggleMute();
  }, []);

  const handleBuy = (kind: "hero" | "weapon", id: string) => {
    const skin = kind === "hero" ? heroSkinById(id) : weaponSkinById(id);
    const byGem = skin.gemPrice > 0;
    if (byGem ? save.gems < skin.gemPrice : save.gold < skin.price) return;
    const s: SaveData = byGem
      ? { ...save, gems: save.gems - skin.gemPrice }
      : { ...save, gold: save.gold - skin.price };
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

  const handleUpgrade = (id: UpgradeId, cost: number) => {
    const def = upgradeDef(id);
    if (!def) return;
    const level = Math.min(def.max, save.upgrades[id] ?? 0);
    // Tính lại giá tại chỗ thay vì tin con số từ giao diện.
    const price = upgradeCost(def, level);
    if (price === 0 || price !== cost || save.gold < price) return;
    applySave({
      ...save,
      gold: save.gold - price,
      upgrades: { ...save.upgrades, [id]: level + 1 },
    });
    sfx.evolve();
  };

  const handleClaim = (id: string) => {
    const result = claimQuest(save, id, day);
    if (result.gems === 0) return;
    applySave(result.save);
    sfx.core();
  };

  const inGame = phase === "playing" || phase === "paused" || phase === "levelup" || phase === "stageclear";

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#14100a]">
      <canvas ref={canvasRef} className="absolute inset-0" style={{ imageRendering: "pixelated" }} />

      {hud && inGame && (
        <HUD
          hud={hud}
          onPause={handlePause}
          onMute={handleMute}
          touch={IS_TOUCH}
        />
      )}

      {hud?.banner && phase === "playing" && <Banner banner={hud.banner} />}

      {phase === "playing" && IS_TOUCH && (
        <TouchControls
          onMove={handleMove}
          onPause={handlePause}
          onMute={handleMute}
          muted={hud?.muted ?? false}
        />
      )}

      {phase === "menu" && !shopOpen && (
        <MenuScreen
          onStart={() => engRef.current?.start()}
          onShop={() => setShopOpen(true)}
          save={save}
          day={day}
        />
      )}

      {shopOpen && (
        <ShopScreen
          save={save}
          day={day}
          onBuy={handleBuy}
          onEquip={handleEquip}
          onUpgrade={handleUpgrade}
          onClaim={handleClaim}
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
