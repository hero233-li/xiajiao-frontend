/** Only web URLs and local, non protocol-relative paths are navigable. */
export function safeAnalysisUrl(value?: string): string | undefined {
  // eslint-disable-next-line no-control-regex -- Control characters must be rejected in untrusted URLs.
  if (!value || /[\u0000-\u0020\u007f\\]/.test(value)) return undefined;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  if (value.startsWith('#')) return value;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
export function safeAnalysisImage(value?: string): string | undefined {
  // Do not let generated Markdown make passive requests to external hosts, API
  // routes or arbitrary local paths. Only reviewed static bank figures may load.
  return value && /^\/bank-figures\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:svg|png|webp|jpe?g)$/.test(value)
    ? value
    : undefined;
}
