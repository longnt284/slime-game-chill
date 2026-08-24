export function capFx<T>(items: T[], limit: number): T[] {
  if (items.length <= limit) return items;
  return items.slice(items.length - limit);
}

export function telegraphAlpha(life: number, maxLife: number): number {
  if (maxLife <= 0) return 0;
  const progress = Math.max(0, Math.min(1, life / maxLife));
  if (progress === 0 || progress === 1) return 0;
  return Math.sin(progress * Math.PI) * 0.72;
}
