import type { GameStats, HudData } from "../game/engine";
import type { Choice } from "../game/data";
import { TOTAL_STAGES } from "../game/data";
import { Icon } from "./icons";

/* ================= HUD ================= */

export function HUD({
  hud,
  onPause,
  onMute,
}: {
  hud: HudData;
  onPause: () => void;
  onMute: () => void;
}) {
  const hpPct = Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100));
  const xpPct = Math.max(0, Math.min(100, (hud.xp / hud.xpNeed) * 100));
  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* trái trên: máu + kinh nghiệm */}
      <div className="absolute top-3 left-3 panel px-3 py-2 w-[300px] max-w-[62vw]">
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
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 w-full px-2">
        <div className="panel px-4 py-1.5 flex items-center gap-3 whitespace-nowrap">
          <span className="font-display text-[13px] text-[#ffd94a]">
            MÀN {hud.stage}/{TOTAL_STAGES}
          </span>
          <span className="w-px h-4 bg-[#6b4423]" />
          <span className="text-[13px] text-[#d9bd8a] font-semibold">{hud.biomeName}</span>
          <span className="w-px h-4 bg-[#6b4423]" />
          <span className="text-[13px] tabular-nums text-[#ffe9b8]">{hud.time}</span>
        </div>

        {!hud.bossActive ? (
          <div className="panel-deep px-3 py-1.5 flex items-center gap-2.5">
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
            <div className="bar-outer w-36 h-[9px] ml-1">
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
          <div className="panel px-3 py-1.5 w-[460px] max-w-[86vw]">
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
      <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
        <div className="flex gap-1.5 pointer-events-auto">
          <button onClick={onMute} className="btn-ghost !px-2.5 !py-1.5" title="Âm thanh (M)">
            <Icon name={hud.muted ? "mute" : "sound"} className="w-4 h-4" />
          </button>
          <button onClick={onPause} className="btn-ghost !px-2.5 !py-1.5" title="Tạm dừng (P)">
            <Icon name="pause" className="w-4 h-4" />
          </button>
        </div>
        <div className="panel-deep px-3 py-1.5 flex items-center gap-3 text-[13px] font-bold tabular-nums">
          <span className="flex items-center gap-1.5">
            <Icon name="skull" className="w-4 h-4 text-[#ff8095]" />
            {hud.kills.toLocaleString("vi")}
          </span>
          <span className="flex items-center gap-1.5 text-[#ff9d2e]">
            <Icon name="core" className="w-4 h-4" />
            {hud.cores}
          </span>
        </div>
      </div>

      {/* trái dưới: kỹ năng */}
      <div className="absolute bottom-3 left-3 flex gap-1.5 flex-wrap max-w-[60vw]">
        {hud.skills.map((s) => (
          <div
            key={s.id}
            title={`${s.name} — Cấp ${s.lv}`}
            className={`skill-chip panel-deep w-[52px] h-[52px] flex flex-col items-center justify-center relative ${s.evolved ? "evolved" : ""}`}
          >
            <Icon name={s.icon} className={`w-6 h-6 ${s.evolved ? "text-[#ffd94a]" : "text-[#ffe9b8]"}`} />
            <span className="absolute bottom-0.5 right-1 text-[10px] font-bold text-[#7ce06a]">{s.lv}</span>
            {s.evolved && <Icon name="crown" className="absolute -top-2 -right-1 w-4 h-4 text-[#ffd94a]" />}
          </div>
        ))}
      </div>

      {/* phải dưới: hướng dẫn */}
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
    </div>
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

export function MenuScreen({ onStart }: { onStart: () => void }) {
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
          Một mình giữa thung lũng, <b className="text-[#ffe9b8]">di chuyển bằng WASD</b> — nhân vật{" "}
          <b className="text-[#ffe9b8]">tự ra chiêu</b>. Dọn 3 đợt quái mỗi màn, hạ trùm, nhặt{" "}
          <b className="text-[#63e6ff]">mảnh kỹ năng</b> và <b className="text-[#ff9d2e]">lõi tiến hóa</b> để mạnh lên qua{" "}
          <b className="text-[#ffe9b8]">100 màn</b>.
        </p>
        <div className="mt-8 flex items-center gap-4 flex-wrap">
          <button onClick={onStart} className="btn text-xl flex items-center gap-3">
            <Icon name="play" className="w-5 h-5" />
            BẮT ĐẦU
          </button>
          {best > 0 && (
            <span className="panel-deep px-4 py-2.5 flex items-center gap-2 text-sm font-bold text-[#ffd94a]">
              <Icon name="crown" className="w-4 h-4" />
              Kỷ lục: Màn {best}
            </span>
          )}
        </div>
        <p className="mt-8 text-[11px] text-[#8a6a44]">
          Đồ họa pixel & chuyển động lấy cảm hứng Stardew Valley • Phím P tạm dừng • M bật/tắt tiếng
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
                <b className="text-[#ffe9b8]">W A S D</b> / phím mũi tên để chạy — đánh là việc của nhân vật
              </span>
            </li>
            <li className="flex items-center gap-2.5">
              <Icon name="wave" className="w-5 h-5 text-[#63e6ff] shrink-0" />
              <span>
                Mỗi màn có <b className="text-[#ffe9b8]">3 đợt quái</b>, dọn đủ sẽ gọi trùm ra
              </span>
            </li>
            <li className="flex items-center gap-2.5">
              <Icon name="core" className="w-5 h-5 text-[#ff9d2e] shrink-0" />
              <span>
                Quái rơi <b className="text-[#63e6ff]">ngọc kinh nghiệm</b>; trùm & quái tinh nhuệ rơi{" "}
                <b className="text-[#ff9d2e]">lõi tiến hóa</b>
              </span>
            </li>
            <li className="flex items-center gap-2.5">
              <Icon name="crown" className="w-5 h-5 text-[#ffd94a] shrink-0" />
              <span>
                Kỹ năng cấp 5 + lõi = <b className="text-[#ffd94a]">TIẾN HÓA</b> thành tuyệt kỹ
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
    <div className="absolute inset-0 z-30 bg-[#0c0704]/75 flex flex-col items-center justify-center px-4">
      <div className="text-center mb-7 anim-rise">
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
          <StatRow icon="crown" label="Kỷ lục" value={`Màn ${Math.max(best, stats.stage)}`} color="text-[#ffd94a]" />
        </div>
        <div className="mt-6 flex gap-3">
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
          <StatRow icon="heart" label="Cấp cuối cùng" value={`Lv ${stats.level}`} color="text-[#7ce06a]" />
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
