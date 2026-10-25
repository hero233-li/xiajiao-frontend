const KEY = 'xj.theme';

/** 深色模式：`.dark` 挂到 <html> 上，Radix 与玻璃令牌会一起切换。 */
export function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark);
  try {
    localStorage.setItem(KEY, dark ? 'dark' : 'light');
  } catch {
    /* 隐私模式忽略 */
  }
}

export function initialTheme(): boolean {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) return saved === 'dark';
  } catch {
    /* 忽略 */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}
