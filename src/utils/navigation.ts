export function safeReturnPath(path: unknown): string {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') || /[\\\r\n]/.test(path)) return '/';
  try { const url = new URL(path,'https://local.invalid'); if (url.origin !== 'https://local.invalid' || url.pathname === '/login') return '/'; return url.pathname + url.search + url.hash; } catch { return '/'; }
}
