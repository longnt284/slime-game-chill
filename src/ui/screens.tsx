import { useEffect, useRef, useState } from "react";
import type { GameStats, HudData } from "../game/engine";
import type { Choice } from "../game/data";
import { TOTAL_STAGES } from "../game/data";
import type { HeroSkinDef, SaveData, WeaponSkinDef } from "../game/shop";
import { HERO_SKINS, WEAPON_SKINS, TIER_COLORS, TIER_NAMES } from "../game/shop";
import { getHeroSprite } from "../game/sprites";
import { Icon } from "./icons";

export const IS_TOUCH =
  typeof window !== "undefined" && (navigator.maxTouchPoints > 0 || "ontouchstart" in window);

/* ================= HUD ================= */

export function HUD({
  hud,
  onPause,
  onMute,
  touch,
}: {
  hud: HudData;
  onPause: () => void;
  onMute: () => void;
  touch: boolean;
}) {
  const hpPct = Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100));
  const xpPct = Math.max(0, Math.min(100, (hud.xp / hud.xpNeed) * 100));
  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* trái trên: máu + kinh nghiệm */}
      <div
        data-hud="health"
        className={`absolute top-3 left-3 panel px-3 py-2 ${touch ? "right-3 w-auto" : "w-[300px] max-w-[62vw]"}`}
        style={touch ? { top: "calc(0.75rem + env(safe-area-inset-top))" } : undefined}
      >
        <div className="flex items-center gap-2">
          <Icon name="heart" className="w-5 h-5 text-[#ff4d6d] shrink-0" />
          <div className="bar-outer flex-1 h-[18px]">
            <div
              className="bar-fill"
              style={{ width: `${hpPct}%`, background: "linear-gradient(180deg,#ff7d95,#ff4d6d 60%,#c9184a)" }}
            />
          </div>
          <span className="text-[13px] font-bold w-[70px] text-right tabular-nums">
            {hud.hp}/{hud.maxHp}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="font-display text-[11px] text-[#ffd94a] w-[52px] shrink-0">LV {hud.lv}</span>
          <div className="bar-outer flex-1 h-[10px]">
            <div className="bar-fill" style={{ width: `${xpPct}%`, background: "linear-gradient(180deg,#a8f09a,#7ce06a 60%,#4ca83f)" }} />
          </div>
        </div>
      </div>

      {/* giữa trên: màn + đợt + trùm */}
      <div
        className={`absolute flex flex-col items-center gap-1.5 ${
          touch
            ? "top-[126px] inset-x-3"
            : "top-3 left-1/2 -translate-x-1/2 w-full px-2"
        }`}
        style={touch ? { top: "calc(126px + env(safe-area-inset-top))" } : undefined}
      >
        <div className="panel px-4 py-1.5 flex items-center gap-3 whitespace-nowrap">
          <span className="font-display text-[13px] text-[#ffd94a]">
            MÀN {hud.stage}/{TOTAL_STAGES}
          </span>
          {!touch && (
            <>
              <span className="w-px h-4 bg-[#6b4423]" />
              <span className="text-[13px] text-[#d9bd8a] font-semibold">{hud.biomeName}</span>
              <span className="w-px h-4 bg-[#6b4423]" />
              <span className="text-[13px] tabular-nums text-[#ffe9b8]">{hud.time}</span>
            </>
          )}
        </div>

        {!hud.bossActive ? (
          <div data-hud="progress" className="panel-deep px-3 py-1.5 flex items-center gap-2.5">
            <span className="text-[11px] font-display text-[#d9bd8a]">ĐỢT</span>
            {[1, 2, 3].map((w) => (
              <span
                key={w}
                className={`w-2.5 h-2.5 rotate-45 border ${
                  hud.wave > w
                    ? "bg-[#7ce06a] border-[#4ca83f]"
                    : hud.wave === w
                      ? "bg-[#ffd94a] border-[#d9932a] wave-dot-active"
                      : "bg-transparent border-[#6b4423]"
                }`}
              />
            ))}
            <Icon name="skull" className={`w-4 h-4 ${hud.wave >= 4 ? "text-[#ff4d6d] blink-soft" : "text-[#6b4423]"}`} />
            <div className={`bar-outer h-[9px] ml-1 ${touch ? "w-20" : "w-36"}`}>
              <div
                className="bar-fill"
                style={{
                  width: `${Math.min(100, (hud.waveKills / hud.waveQuota) * 100)}%`,
                  background: "linear-gradient(180deg,#ffe08a,#f2b53c)",
                }}
              />
            </div>
            <span className="text-[11px] tabular-nums text-[#d9bd8a]">
              {hud.waveKills}/{hud.waveQuota}
            </span>
          </div>
        ) : (
          <div data-hud="progress" className={`panel px-3 py-1.5 ${touch ? "w-[300px]" : "w-[460px]"} max-w-[86vw]`}>
            <div className="flex items-center justify-between mb-1">
              <span className="flex items-center gap-1.5 font-display text-[11px] text-[#ff8095]">
                <Icon name="crown" className="w-4 h-4 text-[#ffd94a]" />
                {hud.bossName}
              </span>
              <span className="text-[11px] tabular-nums text-[#d9bd8a]">
                {Math.ceil(hud.bossHp).toLocaleString("vi")}
              </span>
            </div>
            <div className="bar-outer h-[12px]">
              <div
                className="bar-fill"
                style={{
                  width: `${Math.max(0, (hud.bossHp / hud.bossMaxHp) * 100)}%`,
                  background: "linear-gradient(180deg,#ff7d95,#e02450 55%,#8f1030)",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* phải trên: nút + chỉ số */}
      <div
        className={`absolute flex flex-col gap-1.5 ${touch ? "top-[80px] inset-x-3 items-center" : "top-3 right-3 items-end"}`}
        style={touch ? { top: "calc(80px + env(safe-area-inset-top))" } : undefined}
      >
        {!touch && (
          <div className="flex gap-1.5 pointer-events-auto">
            <button onClick={onMute} className="btn-ghost !px-2.5 !py-1.5" title="Âm thanh (M)">
              <Icon name={hud.muted ? "mute" : "sound"} className="w-4 h-4" />
            </button>
            <button onClick={onPause} className="btn-ghost !px-2.5 !py-1.5" title="Tạm dừng (P)">
              <Icon name="pause" className="w-4 h-4" />
            </button>
          </div>
        )}
        <div data-hud="stats" className="panel-deep px-3 py-1.5 flex items-center gap-3 text-[13px] font-bold tabular-nums">
          <span className="flex items-center gap-1.5">
            <Icon name="skull" className="w-4 h-4 text-[#ff8095]" />
            {hud.kills.toLocaleString("vi")}
          </span>
          <span className="flex items-center gap-1.5 text-[#ff9d2e]">
            <Icon name="core" className="w-4 h-4" />
            {hud.cores}
          </span>
          <span className="flex items-center gap-1.5 text-[#ffd94a]">
            <Icon name="coin" className="w-4 h-4" />
            {hud.goldRun}
          </span>
        </div>
      </div>

      {/* kỹ năng */}
      <div
        className={`absolute flex gap-1.5 flex-wrap max-w-[60vw] ${touch ? "top-[214px] left-3" : "bottom-3 left-3"}`}
        style={touch ? { top: "calc(214px + env(safe-area-inset-top))" } : undefined}
      >
        {hud.skills.map((s) => {
          const maxed = s.lv >= s.maxLv;
          const shardPct = s.shardNeed > 0 ? Math.min(100, (s.shards / s.shardNeed) * 100) : 100;
          return (
            <div
              key={s.id}
              title={
                maxed
                  ? `${s.name} — Bậc ${s.lv}/${s.maxLv} (tối đa)`
                  : `${s.name} — Bậc ${s.lv}/${s.maxLv} • mảnh ${s.shards}/${s.shardNeed}`
              }
              className={`skill-chip panel-deep ${touch ? "w-[42px] h-[46px]" : "w-[52px] h-[58px]"} flex flex-col items-center justify-center relative ${s.evolved ? "evolved" : ""}`}
            >
              <Icon name={s.icon} className={`${touch ? "w-5 h-5" : "w-6 h-6"} ${s.evolved ? "text-[#ffd94a]" : "text-[#ffe9b8]"}`} />
              <span className={`absolute top-0.5 right-1 text-[10px] font-bold ${maxed ? "text-[#ffd94a]" : "text-[#7ce06a]"}`}>
                {s.lv}
              </span>
              {/* Thanh mảnh vũ khí: đầy là lên một bậc mới */}
              <div className="absolute bottom-[3px] left-[4px] right-[4px] h-[4px] bg-[#2c1a0c] border border-[#6b4423]">
                <div
                  className="h-full"
                  style={{
                    width: `${shardPct}%`,
                    background: maxed
                      ? "linear-gradient(180deg,#ffe08a,#d9932a)"
                      : "linear-gradient(180deg,#9beaff,#2f8fb5)",
                  }}
                />
              </div>
              {s.evolved && <Icon name="crown" className="absolute -top-2 -right-1 w-4 h-4 text-[#ffd94a]" />}
            </div>
          );
        })}
      </div>

      {/* phải dưới: hướng dẫn (chỉ desktop) */}
      {!touch && (
        <div className="absolute bottom-3 right-3 panel-deep px-3 py-2 text-[11px] text-[#d9bd8a] flex items-center gap-2">
          <span className="keycap !min-w-[22px] !h-[22px] !text-[9px]">W</span>
          <span className="keycap !min-w-[22px] !h-[22px] !text-[9px]">A</span>
          <span className="keycap !min-w-[22px] !h-[22px] !text-[9px]">S</span>
          <span className="keycap !min-w-[22px] !h-[22px] !text-[9px]">D</span>
          <span className="ml-1">Di chuyển • Nhân vật tự chiến đấu</span>
          <span className="text-[#6b4423]">|</span>
          <span>P: Dừng</span>
          <span className="text-[#6b4423]">|</span>
          <span>M: Tiếng</span>
        </div>
      )}
    </div>
  );
}

/* ================= JOYSTICK + NÚT CHẠM ================= */

function Joystick({ onMove }: { onMove: (x: number, y: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const pid = useRef<number | null>(null);
  const R = 50;

  const update = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > R) {
      dx = (dx / d) * R;
      dy = (dy / d) * R;
    }
    setKnob({ x: dx, y: dy });
    onMove(dx / R, dy / R);
  };
  const end = () => {
    pid.current = null;
    setActive(false);
    setKnob({ x: 0, y: 0 });
    onMove(0, 0);
  };

  return (
    <div
      className="absolute bottom-6 left-5 z-20 pointer-events-auto select-none"
      style={{ touchAction: "none", bottom: "calc(1.5rem + env(safe-area-inset-bottom))", left: "calc(1.25rem + env(safe-area-inset-left))" }}
    >
      <div
        data-control="joystick-pad"
        ref={ref}
        onPointerDown={(e) => {
          pid.current = e.pointerId;
          setActive(true);
          e.currentTarget.setPointerCapture(e.pointerId);
          update(e);
        }}
        onPointerMove={(e) => {
          if (pid.current === e.pointerId) update(e);
        }}
        onPointerUp={(e) => {
          if (pid.current === e.pointerId) end();
        }}
        onPointerCancel={end}
        className="relative w-[136px] h-[136px] rounded-full panel-deep"
        style={{ boxShadow: "inset 0 0 0 3px #6b4423, 0 6px 0 rgba(0,0,0,.45)" }}
      >
        <div className="absolute inset-3 rounded-full border-2 border-dashed border-[#6b4423]/70" />
        <div className="absolute inset-0 flex items-center justify-center text-[#6b4423] font-display text-[10px] tracking-widest">
          {active ? "" : "DI CHUYỂN"}
        </div>
        <div
          data-control="joystick-knob"
          className="absolute w-[58px] h-[58px] rounded-full"
          style={{
            left: "50%",
            top: "50%",
            transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`,
            transition: active ? "none" : "transform .18s cubic-bezier(.2,1.4,.4,1)",
            background: "linear-gradient(180deg,#ffe08a 0%,#f2b53c 55%,#d9932a 100%)",
            border: "3px solid #7a4d22",
            boxShadow: "inset 0 3px 0 rgba(255,255,255,.45), inset 0 -5px 0 rgba(122,60,10,.35), 0 3px 0 rgba(0,0,0,.5)",
          }}
        />
      </div>
    </div>
  );
}

export function TouchControls({
  onMove,
  onPause,
  onMute,
  muted,
}: {
  onMove: (x: number, y: number) => void;
  onPause: () => void;
  onMute: () => void;
  muted: boolean;
}) {
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;
  useEffect(() => {
    return () => onMoveRef.current(0, 0);
  }, []);
  return (
    <>
      <Joystick onMove={onMove} />
      <div
        className="absolute bottom-6 right-5 z-20 pointer-events-auto flex items-end gap-3"
        style={{ touchAction: "none", bottom: "calc(1.5rem + env(safe-area-inset-bottom))", right: "calc(1.25rem + env(safe-area-inset-right))" }}
      >
        <button
          onClick={onMute}
          className="w-12 h-12 rounded-full btn-ghost !p-0 flex items-center justify-center"
          title="Âm thanh"
        >
          <Icon name={muted ? "mute" : "sound"} className="w-5 h-5" />
        </button>
        <button
          onClick={onPause}
          className="w-16 h-16 rounded-full btn !p-0 flex items-center justify-center"
          title="Tạm dừng"
        >
          <Icon name="pause" className="w-6 h-6" />
        </button>
      </div>
    </>
  );
}

/* ================= BANNER ================= */

export function Banner({ banner }: { banner: { text: string; sub: string; key: number } }) {
  return (
    <div className="absolute inset-x-0 top-[26%] z-20 flex flex-col items-center pointer-events-none">
      <div key={banner.key} className="banner-anim text-center">
        <div className="font-display title-glow text-4xl md:text-6xl text-[#ffd94a] px-6">{banner.text}</div>
        <div className="mt-2 font-display text-sm md:text-lg text-[#ffe9b8] tracking-wide" style={{ textShadow: "0 2px 0 rgba(0,0,0,.7)" }}>
          {banner.sub}
        </div>
      </div>
    </div>
  );
}

/* ================= MENU ================= */

export function MenuScreen({ onStart, onShop, gold }: { onStart: () => void; onShop: () => void; gold: number }) {
  const best = parseInt(localStorage.getItem("tvqv_best") || "0", 10);
  return (
    <div className="absolute inset-0 z-30 flex items-stretch justify-between bg-gradient-to-r from-[#140d06f2] via-[#140d06c8] to-[#140d0640]">
      {/* trái: tiêu đề */}
      <div className="flex flex-col justify-center px-8 md:px-16 max-w-2xl">
        <div className="anim-rise flex items-center gap-2 mb-5">
          <span className="panel-deep px-3 py-1 font-display text-[11px] text-[#7ce06a] tracking-wider">SURVIVOR-LIKE</span>
          <span className="panel-deep px-3 py-1 font-display text-[11px] text-[#ffd94a] tracking-wider">100 TRÙM</span>
        </div>
        <h1 className="title-bob font-display leading-[0.95] text-[#ffd94a] title-glow text-5xl md:text-7xl">
          THUNG LŨNG
          <br />
          <span className="text-[#ff8095]">QUÁI VẬT</span>
        </h1>
        <p className="mt-6 text-[15px] md:text-base text-[#d9bd8a] leading-relaxed max-w-md">
          Một mình giữa thung lũng, <b className="text-[#ffe9b8]">di chuyển bằng WASD</b> (hoặc cần ảo trên điện thoại) — nhân vật{" "}
          <b className="text-[#ffe9b8]">tự ra chiêu</b>. Dọn 3 đợt quái mỗi màn, hạ trùm, nhặt{" "}
          <b className="text-[#63e6ff]">mảnh vũ khí</b> để lên bậc và <b className="text-[#ff9d2e]">lõi tiến hóa</b> để hóa
          tuyệt kỹ, cày <b className="text-[#ffd94a]">vàng</b> sắm skin chất chơi.
        </p>
        <div className="mt-8 flex items-center gap-4 flex-wrap">
          <button onClick={onStart} className="btn text-xl flex items-center gap-3">
            <Icon name="play" className="w-5 h-5" />
            BẮT ĐẦU
          </button>
          <button onClick={onShop} className="btn-ghost text-base flex items-center gap-2.5 !py-3.5">
            <Icon name="bag" className="w-5 h-5 text-[#ffd94a]" />
            CỬA HÀNG
          </button>
          <span className="panel-deep px-4 py-2.5 flex items-center gap-2 text-sm font-bold text-[#ffd94a]">
            <Icon name="coin" className="w-5 h-5" />
            {gold.toLocaleString("vi")}
          </span>
        </div>
        {best > 0 && (
          <p className="mt-5 text-[13px] text-[#d9bd8a] flex items-center gap-2">
            <Icon name="crown" className="w-4 h-4 text-[#ffd94a]" />
            Kỷ lục: <b className="text-[#ffd94a]">Màn {best}</b> — sống càng lâu, vàng càng nhiều
          </p>
        )}
        <p className="mt-6 text-[11px] text-[#8a6a44]">
          Đồ họa pixel & chuyển động lấy cảm hứng Stardew Valley • P tạm dừng • M bật/tắt tiếng
        </p>
      </div>

      {/* phải: cẩm nang */}
      <div className="hidden lg:flex flex-col justify-center gap-4 pr-14 w-[360px]">
        <div className="panel p-4 anim-rise" style={{ animationDelay: "0.08s" }}>
          <div className="font-display text-[13px] text-[#ffd94a] mb-3 flex items-center gap-2">
            <Icon name="sword" className="w-4 h-4" /> CÁCH CHƠI
          </div>
          <ul className="space-y-2.5 text-[13px] text-[#d9bd8a]">
            <li className="flex items-center gap-2.5">
              <Icon name="wasd" className="w-5 h-5 text-[#7ce06a] shrink-0" />
              <span>
                <b className="text-[#ffe9b8]">W A S D</b> / cần ảo để chạy — đánh là việc của nhân vật
              </span>
            </li>
            <li className="flex items-center gap-2.5">
              <Icon name="wave" className="w-5 h-5 text-[#63e6ff] shrink-0" />
              <span>
                Mỗi màn có <b className="text-[#ffe9b8]">3 đợt quái</b>, dọn đủ sẽ gọi trùm ra
              </span>
            </li>
            <li className="flex items-center gap-2.5">
              <Icon name="coin" className="w-5 h-5 text-[#ffd94a] shrink-0" />
              <span>
                Sống sót mỗi giây, qua đợt, hạ trùm đều ra <b className="text-[#ffd94a]">vàng</b> — vào cửa hàng sắm{" "}
                <b className="text-[#ffe9b8]">40 skin nhân vật</b> và <b className="text-[#ffe9b8]">20 skin vũ khí</b>
              </span>
            </li>
            <li className="flex items-center gap-2.5">
              <Icon name="shard" className="w-5 h-5 text-[#63e6ff] shrink-0" />
              <span>
                Gom <b className="text-[#63e6ff]">mảnh vũ khí</b> rơi ra để lên bậc — mỗi vũ khí{" "}
                <b className="text-[#ffe9b8]">6 bậc</b>, bậc càng cao thì sát thương, độ phủ và số quái dính đòn càng lớn
              </span>
            </li>
            <li className="flex items-center gap-2.5">
              <Icon name="crown" className="w-5 h-5 text-[#ffd94a] shrink-0" />
              <span>
                Vũ khí bậc 5 + lõi = <b className="text-[#ffd94a]">TIẾN HÓA</b> thành tuyệt kỹ
              </span>
            </li>
          </ul>
        </div>
        <div className="panel p-4 anim-rise" style={{ animationDelay: "0.16s" }}>
          <div className="font-display text-[13px] text-[#ffd94a] mb-3">6 KỸ NĂNG • 6 BỊ ĐỘNG</div>
          <div className="grid grid-cols-6 gap-2 text-[#ffe9b8]">
            {["bolt", "orbit", "aura", "zap", "boom", "frost"].map((s) => (
              <div key={s} className="panel-deep aspect-square flex items-center justify-center">
                <Icon name={s} className="w-6 h-6" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-6 gap-2 mt-2 text-[#c9a0e8]">
            {["speed", "heart", "power", "haste", "magnet", "regen"].map((s) => (
              <div key={s} className="panel-deep aspect-square flex items-center justify-center">
                <Icon name={s} className="w-6 h-6" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= SHOP ================= */

function HeroPreview({ skin }: { skin: HeroSkinDef }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cv.width, cv.height);
    const spr = getHeroSprite(0, skin);
    ctx.drawImage(spr, (cv.width - 12 * 5) / 2, (cv.height - 14 * 5) / 2 + 4, 12 * 5, 14 * 5);
  }, [skin]);
  return <canvas ref={ref} width={72} height={80} style={{ imageRendering: "pixelated" }} />;
}

function WeaponPreview({ skin }: { skin: WeaponSkinDef }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cv.width, cv.height);
    // quầng sáng
    const g = ctx.createRadialGradient(44, 40, 4, 44, 40, 34);
    g.addColorStop(0, skin.aura + "55");
    g.addColorStop(1, skin.aura + "00");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 88, 80);
    // hai tia chéo
    for (const [ang, len] of [
      [-0.5, 30],
      [0.5, 30],
    ] as const) {
      ctx.save();
      ctx.translate(44, 40);
      ctx.rotate(ang);
      ctx.fillStyle = skin.bolt;
      ctx.fillRect(-len, -4, len * 2, 8);
      ctx.fillStyle = skin.core;
      ctx.fillRect(-len + 5, -2, len * 1.4, 4);
      ctx.restore();
    }
    // kiếm xoay
    ctx.save();
    ctx.translate(44, 40);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = skin.blade;
    ctx.fillRect(-16, -3, 32, 6);
    ctx.fillRect(-3, -16, 6, 32);
    ctx.fillStyle = skin.blade2;
    ctx.fillRect(-13, -1.5, 26, 3);
    ctx.restore();
    ctx.fillStyle = skin.glow;
    ctx.fillRect(41, 37, 6, 6);
  }, [skin]);
  return <canvas ref={ref} width={88} height={80} style={{ imageRendering: "pixelated" }} />;
}

export function ShopScreen({
  gold,
  save,
  onBuy,
  onEquip,
  onClose,
}: {
  gold: number;
  save: SaveData;
  onBuy: (kind: "hero" | "weapon", id: string, price: number) => void;
  onEquip: (kind: "hero" | "weapon", id: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"hero" | "weapon">("hero");
  const items = (tab === "hero" ? HERO_SKINS : WEAPON_SKINS) as (HeroSkinDef | WeaponSkinDef)[];
  const owned = tab === "hero" ? save.heroOwned : save.weaponOwned;
  const equipped = tab === "hero" ? save.hero : save.weapon;

  return (
    <div className="absolute inset-0 z-40 bg-[#0c0704]/85 flex items-center justify-center p-3 md:p-6">
      <div className="panel w-full max-w-5xl h-full max-h-[92vh] flex flex-col anim-rise overflow-hidden">
        {/* header */}
        <div className="flex items-center gap-3 px-4 md:px-6 py-3 border-b-[3px] border-[#6b4423] flex-wrap">
          <Icon name="bag" className="w-7 h-7 text-[#ffd94a]" />
          <div className="font-display text-2xl text-[#ffd94a] title-glow">CỬA HÀNG</div>
          <div className="flex gap-2 ml-2">
            <button
              onClick={() => setTab("hero")}
              className="btn-ghost !py-1.5 !text-[13px]"
              style={
                tab === "hero"
                  ? { color: "#2c1a0c", background: "linear-gradient(180deg,#ffe08a,#d9932a)", borderColor: "#7a4d22" }
                  : undefined
              }
            >
              NHÂN VẬT ({save.heroOwned.length}/{HERO_SKINS.length})
            </button>
            <button
              onClick={() => setTab("weapon")}
              className="btn-ghost !py-1.5 !text-[13px]"
              style={
                tab === "weapon"
                  ? { color: "#2c1a0c", background: "linear-gradient(180deg,#ffe08a,#d9932a)", borderColor: "#7a4d22" }
                  : undefined
              }
            >
              VŨ KHÍ ({save.weaponOwned.length}/{WEAPON_SKINS.length})
            </button>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="panel-deep px-3.5 py-1.5 flex items-center gap-2 font-bold text-[#ffd94a] tabular-nums">
              <Icon name="coin" className="w-5 h-5" />
              {gold.toLocaleString("vi")}
            </span>
            <button onClick={onClose} className="btn-ghost !px-3 !py-1.5 font-display text-[13px]">
              ĐÓNG
            </button>
          </div>
        </div>

        <div className="px-4 md:px-6 py-2 text-[12px] text-[#d9bd8a] border-b-2 border-[#3d2712]">
          Kiếm <b className="text-[#ffd94a]">vàng</b> bằng cách sinh tồn: +1~26/giây • diệt quái +1 • quái tinh nhuệ +6 • qua đợt +15~215 • hạ trùm +114~510
        </div>

        {/* lưới skin */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {items.map((s, i) => {
              const isOwned = owned.includes(s.id);
              const isEquipped = equipped === s.id;
              const canBuy = gold >= s.price;
              return (
                <div
                  key={s.id}
                  className="card-in panel-deep p-3 flex flex-col items-center relative"
                  style={{
                    animationDelay: `${Math.min(i * 0.02, 0.5)}s`,
                    borderColor: isEquipped ? "#ffd94a" : undefined,
                    boxShadow: isEquipped
                      ? "inset 0 0 0 2px #1c0f06, 0 0 16px rgba(255,217,74,.35), 0 4px 0 rgba(0,0,0,.4)"
                      : undefined,
                  }}
                >
                  <span
                    className="absolute top-1.5 left-1.5 font-display text-[9px] px-1.5 py-0.5 rounded"
                    style={{ background: TIER_COLORS[s.tier] + "30", color: TIER_COLORS[s.tier] }}
                  >
                    {TIER_NAMES[s.tier]}
                  </span>
                  {isEquipped && (
                    <span className="absolute top-1.5 right-1.5">
                      <Icon name="crown" className="w-4 h-4 text-[#ffd94a]" />
                    </span>
                  )}
                  <div className="h-[84px] flex items-center justify-center">
                    {tab === "hero" ? <HeroPreview skin={s as HeroSkinDef} /> : <WeaponPreview skin={s as WeaponSkinDef} />}
                  </div>
                  <div className="mt-1 text-[12.5px] font-bold text-[#ffe9b8] text-center leading-tight">{s.name}</div>
                  <div className="mt-2 w-full">
                    {isEquipped ? (
                      <div className="w-full text-center font-display text-[11px] py-1.5 rounded bg-[#7ce06a]/20 text-[#7ce06a] border border-[#7ce06a]/50">
                        ĐANG DÙNG
                      </div>
                    ) : isOwned ? (
                      <button onClick={() => onEquip(tab, s.id)} className="btn-ghost w-full !py-1.5 !text-[12px]">
                        TRANG BỊ
                      </button>
                    ) : (
                      <button
                        onClick={() => onBuy(tab, s.id, s.price)}
                        disabled={!canBuy}
                        className="btn w-full !py-1.5 !text-[12px] flex items-center justify-center gap-1.5"
                      >
                        <Icon name="coin" className="w-3.5 h-3.5" />
                        {s.price === 0 ? "MIỄN PHÍ" : s.price.toLocaleString("vi")}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= PAUSE ================= */

export function PauseScreen({
  onResume,
  onRestart,
  onMenu,
}: {
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 bg-[#0c0704]/70 flex items-center justify-center">
      <div className="panel p-8 w-[380px] max-w-[90vw] text-center anim-rise">
        <div className="font-display text-3xl text-[#ffd94a] title-glow">TẠM DỪNG</div>
        <p className="text-[13px] text-[#d9bd8a] mt-2">Thung lũng đang nín thở chờ bạn...</p>
        <div className="mt-6 flex flex-col gap-3">
          <button onClick={onResume} className="btn flex items-center justify-center gap-2">
            <Icon name="play" className="w-4 h-4" /> TIẾP TỤC
          </button>
          <button onClick={onRestart} className="btn-ghost">CHƠI LẠI TỪ MÀN 1</button>
          <button onClick={onMenu} className="btn-ghost">VỀ MENU</button>
        </div>
        <p className="mt-5 text-[11px] text-[#8a6a44]">
          P / Esc: tiếp tục • M: âm thanh • 1-2-3: chọn nâng cấp
        </p>
      </div>
    </div>
  );
}

/* ================= LEVEL UP ================= */

const TAG_STYLE: Record<Choice["kind"], string> = {
  evolve: "bg-[#ffd94a] text-[#2c1a0c]",
  new: "bg-[#63e6ff] text-[#083344]",
  up: "bg-[#7ce06a] text-[#14350f]",
  passive: "bg-[#c9a0e8] text-[#2c1040]",
  mastery: "bg-[#ff9d2e] text-[#401d04]",
  heal: "bg-[#ff8095] text-[#4a0816]",
};
const TILTS = ["-3deg", "0deg", "3deg"];

export function LevelUpScreen({
  hud,
  choices,
  onPick,
}: {
  hud: HudData | null;
  choices: Choice[];
  onPick: (i: number) => void;
}) {
  return (
    <div className="absolute inset-0 z-30 bg-[#0c0704]/75 flex flex-col items-center justify-center px-4 overflow-y-auto py-6">
      <div className="text-center mb-7 anim-rise shrink-0">
        <div className="font-display text-4xl md:text-5xl text-[#7ce06a]" style={{ textShadow: "0 0 22px rgba(124,224,106,.5), 0 4px 0 #1d4a16" }}>
          LÊN CẤP {hud ? hud.lv : ""}!
        </div>
        <div className="mt-2 text-[14px] text-[#d9bd8a]">Chọn một mảnh sức mạnh — phím 1 • 2 • 3</div>
      </div>
      <div className="flex gap-5 flex-wrap justify-center max-w-4xl">
        {choices.map((c, i) => (
          <button
            key={`${c.id}_${i}`}
            onClick={() => onPick(i)}
            className={`choice-card card-in panel w-[240px] p-5 text-left flex flex-col items-center cursor-pointer ${
              c.kind === "evolve" ? "!border-[#ffd94a] blink-soft" : ""
            }`}
            style={{ "--tilt": TILTS[i], animationDelay: `${i * 0.09}s` } as React.CSSProperties}
          >
            <div className="flex items-start justify-between w-full">
              <span className={`font-display text-[10px] px-2 py-0.5 rounded ${TAG_STYLE[c.kind]}`}>{c.tag}</span>
              <span className="keycap !min-w-[24px] !h-[24px] !text-[10px]">{i + 1}</span>
            </div>
            <div
              className={`mt-4 w-16 h-16 flex items-center justify-center panel-deep ${
                c.kind === "evolve" ? "text-[#ffd94a]" : c.kind === "passive" ? "text-[#c9a0e8]" : "text-[#ffe9b8]"
              }`}
            >
              <Icon name={c.icon} className="w-9 h-9" />
            </div>
            <div className={`mt-3 font-display text-[15px] text-center leading-tight ${c.kind === "evolve" ? "text-[#ffd94a]" : "text-[#ffe9b8]"}`}>
              {c.name}
            </div>
            <div className="mt-2 text-[12.5px] text-[#d9bd8a] text-center leading-snug">{c.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ================= STAGE CLEAR ================= */

function StatRow({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between panel-deep px-4 py-2.5">
      <span className="flex items-center gap-2.5 text-[13px] text-[#d9bd8a]">
        <Icon name={icon} className={`w-5 h-5 ${color}`} /> {label}
      </span>
      <span className="font-bold text-[15px] tabular-nums text-[#ffe9b8]">{value}</span>
    </div>
  );
}

export function StageClearScreen({ stats, onNext }: { stats: GameStats; onNext: () => void }) {
  return (
    <div className="absolute inset-0 z-30 bg-[#0c0704]/70 flex items-center justify-center px-4">
      <div className="panel p-8 w-[420px] max-w-[92vw] text-center anim-rise">
        <Icon name="crown" className="w-12 h-12 text-[#ffd94a] mx-auto" />
        <div className="mt-3 font-display text-3xl text-[#ffd94a] title-glow">MÀN {stats.stage} HOÀN THÀNH!</div>
        <p className="text-[13px] text-[#d9bd8a] mt-1.5">Trùm đã ngã xuống. Chiến lợi phẩm: +1 Lõi tiến hóa, hồi 30% máu.</p>
        <div className="mt-5 space-y-2">
          <StatRow icon="skull" label="Quái đã hạ" value={stats.kills.toLocaleString("vi")} color="text-[#ff8095]" />
          <StatRow icon="haste" label="Thời gian" value={stats.time} color="text-[#63e6ff]" />
          <StatRow icon="heart" label="Cấp nhân vật" value={`Lv ${stats.level}`} color="text-[#7ce06a]" />
          <StatRow icon="coin" label="Vàng vừa kiếm" value={`+${stats.goldEarned.toLocaleString("vi")}`} color="text-[#ffd94a]" />
        </div>
        <button onClick={onNext} className="btn mt-6 w-full flex items-center justify-center gap-2 text-lg">
          MÀN {stats.stage + 1} <Icon name="arrow" className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

/* ================= GAME OVER ================= */

export function GameOverScreen({
  stats,
  onRetry,
  onMenu,
}: {
  stats: GameStats;
  onRetry: () => void;
  onMenu: () => void;
}) {
  const best = parseInt(localStorage.getItem("tvqv_best") || "0", 10);
  return (
    <div className="absolute inset-0 z-30 bg-[#1a0508]/80 flex items-center justify-center px-4">
      <div className="panel p-8 w-[440px] max-w-[92vw] text-center anim-rise !border-[#c9184a]">
        <Icon name="skull" className="w-14 h-14 text-[#ff4d6d] mx-auto" />
        <div className="mt-3 font-display text-4xl text-[#ff4d6d]" style={{ textShadow: "0 0 22px rgba(255,77,109,.45), 0 4px 0 #4a0816" }}>
          NGÃ XUỐNG
        </div>
        <p className="text-[14px] text-[#d9bd8a] mt-2">
          Bạn dừng chân ở <b className="text-[#ffd94a]">Màn {stats.stage}</b> / {TOTAL_STAGES}
          {best > 0 && (
            <>
              {" "}
              — kỷ lục <b className="text-[#ffd94a]">Màn {best}</b>
            </>
          )}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <StatRow icon="skull" label="Hạ gục" value={stats.kills.toLocaleString("vi")} color="text-[#ff8095]" />
          <StatRow icon="haste" label="Thời gian" value={stats.time} color="text-[#63e6ff]" />
          <StatRow icon="heart" label="Cấp độ" value={`Lv ${stats.level}`} color="text-[#7ce06a]" />
          <StatRow icon="coin" label="Vàng trận này" value={`+${stats.goldEarned.toLocaleString("vi")}`} color="text-[#ffd94a]" />
        </div>
        <p className="mt-3 text-[12px] text-[#d9bd8a]">
          Vàng đã cất vào túi — về <b className="text-[#ffd94a]">Cửa hàng</b> sắm skin thôi!
        </p>
        <div className="mt-5 flex gap-3">
          <button onClick={onRetry} className="btn flex-1 flex items-center justify-center gap-2">
            <Icon name="play" className="w-4 h-4" /> CHƠI LẠI
          </button>
          <button onClick={onMenu} className="btn-ghost flex-1">
            VỀ MENU
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= VICTORY ================= */

export function VictoryScreen({
  stats,
  onRetry,
  onMenu,
}: {
  stats: GameStats;
  onRetry: () => void;
  onMenu: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 bg-[#171004]/80 flex items-center justify-center px-4">
      <div className="panel p-9 w-[480px] max-w-[92vw] text-center anim-rise !border-[#ffd94a]">
        <Icon name="crown" className="w-16 h-16 text-[#ffd94a] mx-auto spin-slow" />
        <div className="mt-4 font-display text-4xl text-[#ffd94a] title-glow leading-tight">
          HUYỀN THOẠI
          <br />
          THUNG LŨNG!
        </div>
        <p className="text-[14px] text-[#d9bd8a] mt-3">
          Bạn đã chinh phục <b className="text-[#ffd94a]">toàn bộ 100 màn</b> và hạ gục Hoàng Đế Hư Vô. Thung lũng lại xanh
          tươi — nhờ bạn.
        </p>
        <div className="mt-5 space-y-2">
          <StatRow icon="skull" label="Tổng quái đã hạ" value={stats.kills.toLocaleString("vi")} color="text-[#ff8095]" />
          <StatRow icon="haste" label="Tổng thời gian" value={stats.time} color="text-[#63e6ff]" />
          <StatRow icon="coin" label="Vàng trận này" value={`+${stats.goldEarned.toLocaleString("vi")}`} color="text-[#ffd94a]" />
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={onRetry} className="btn flex-1 flex items-center justify-center gap-2">
            <Icon name="play" className="w-4 h-4" /> CHƠI LẦN NỮA
          </button>
          <button onClick={onMenu} className="btn-ghost flex-1">
            VỀ MENU
          </button>
        </div>
      </div>
    </div>
  );
}
