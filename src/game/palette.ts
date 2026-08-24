/* Bảng màu vũ khí và phép chuyển màu.
   Mỗi skin vũ khí có một màu gốc cùng vài màu chuyển tiếp; hiệu ứng trong trận
   sẽ trôi qua lại giữa các bảng màu đó để đánh nhìn lúc nào cũng thấy mới. */

export interface WeaponPalette {
  /** Thân đạn bùa. */
  bolt: string;
  /** Lõi sáng giữa đạn. */
  core: string;
  /** Lưỡi kiếm và boomerang. */
  blade: string;
  /** Sống kiếm, phần tối. */
  blade2: string;
  /** Hào quang quét quanh nhân vật. */
  aura: string;
  /** Ánh sáng mạnh nhất, dùng cho chiêu đã tiến hóa. */
  glow: string;
}

export const PALETTE_KEYS: (keyof WeaponPalette)[] = ["bolt", "core", "blade", "blade2", "aura", "glow"];

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const wrapHue = (h: number) => ((h % 1) + 1) % 1;

export interface Rgb {
  r: number;
  g: number;
  b: number;
}
export interface Hsl {
  h: number;
  s: number;
  l: number;
}

/** Đọc mã hex 3 hoặc 6 ký tự; chuỗi hỏng trả về màu đen thay vì NaN. */
export function hexToRgb(hex: string): Rgb {
  const raw = String(hex ?? "").trim().replace(/^#/, "");
  const full = raw.length === 3 ? raw.replace(/./g, (c) => c + c) : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return { r: 0, g: 0, b: 0 };
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const part = (v: number) => Math.round(clamp01(v / 255) * 255).toString(16).padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rd = r / 255;
  const gd = g / 255;
  const bd = b / 255;
  const max = Math.max(rd, gd, bd);
  const min = Math.min(rd, gd, bd);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (l > 0.5 ? 2 - max - min : max + min);
  let h: number;
  if (max === rd) h = ((gd - bd) / d + (gd < bd ? 6 : 0)) / 6;
  else if (max === gd) h = ((bd - rd) / d + 2) / 6;
  else h = ((rd - gd) / d + 4) / 6;
  return { h, s, l };
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const hue = wrapHue(h);
  const sat = clamp01(s);
  const lum = clamp01(l);
  if (sat === 0) {
    const v = Math.round(lum * 255);
    return { r: v, g: v, b: v };
  }
  const q = lum < 0.5 ? lum * (1 + sat) : lum + sat - lum * sat;
  const p = 2 * lum - q;
  const channel = (t: number) => {
    const tt = wrapHue(t);
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  return {
    r: Math.round(channel(hue + 1 / 3) * 255),
    g: Math.round(channel(hue) * 255),
    b: Math.round(channel(hue - 1 / 3) * 255),
  };
}

export const hexToHsl = (hex: string): Hsl => rgbToHsl(hexToRgb(hex));
export const hslToHex = (hsl: Hsl): string => rgbToHex(hslToRgb(hsl));

/** Trộn hai màu theo tỉ lệ t trong khoảng 0..1. */
export function mixHex(a: string, b: string, t: number): string {
  const k = clamp01(t);
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbToHex({
    r: ca.r + (cb.r - ca.r) * k,
    g: ca.g + (cb.g - ca.g) * k,
    b: ca.b + (cb.b - ca.b) * k,
  });
}

/**
 * Xoay cả bảng màu về phía một tông màu mới nhưng giữ nguyên tương quan
 * sáng tối giữa các thành phần, nhờ vậy skin đổi màu mà không vỡ hình.
 * Màu gần như trắng hoặc xám cũng được kéo lên một chút độ bão hòa để
 * người chơi nhìn thấy rõ sự chuyển màu.
 */
export function shiftPalette(base: WeaponPalette, target: string): WeaponPalette {
  const anchor = hexToHsl(base.bolt);
  const goal = hexToHsl(target);
  const delta = goal.h - anchor.h;
  const shifted = {} as WeaponPalette;
  for (const key of PALETTE_KEYS) {
    const c = hexToHsl(base[key]);
    shifted[key] = hslToHex({
      h: c.h + delta,
      s: clamp01(c.s + (goal.s - c.s) * (c.s < 0.12 ? 0.55 : 0.4)),
      l: c.l,
    });
  }
  return shifted;
}

export function mixPalette(a: WeaponPalette, b: WeaponPalette, t: number): WeaponPalette {
  const blended = {} as WeaponPalette;
  for (const key of PALETTE_KEYS) blended[key] = mixHex(a[key], b[key], t);
  return blended;
}

/** Số giây mỗi bảng màu được giữ trước khi chuyển sang bảng kế tiếp. */
export const MOOD_PERIOD = 6;
/** Phần đầu chu kỳ giữ nguyên màu, phần còn lại mới hòa dần sang màu sau. */
const BLEND_FROM = 0.55;

const smoothstep = (t: number) => {
  const k = clamp01(t);
  return k * k * (3 - 2 * k);
};

/**
 * Bảng màu tại một thời điểm: giữ màu một lúc rồi hòa mượt sang màu kế tiếp,
 * thay vì đổi liên tục làm rối mắt.
 */
export function weaponPaletteAt(moods: WeaponPalette[], seconds: number): WeaponPalette {
  if (moods.length === 0) throw new Error("Skin vũ khí phải có ít nhất một bảng màu");
  if (moods.length === 1) return moods[0];
  const t = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const spot = t / MOOD_PERIOD;
  const index = Math.floor(spot) % moods.length;
  const frac = spot - Math.floor(spot);
  if (frac <= BLEND_FROM) return moods[index];
  const next = (index + 1) % moods.length;
  return mixPalette(moods[index], moods[next], smoothstep((frac - BLEND_FROM) / (1 - BLEND_FROM)));
}
