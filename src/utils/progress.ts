export function progressStyle(percent: number) {
  const actual = Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 0;
  return {
    width: `${actual > 0 ? Math.max(3, actual) : 0}%`,
    background: actual === 100 ? 'var(--color-success)' : 'var(--color-primary)',
  };
}
