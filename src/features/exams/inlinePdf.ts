/**
 * 判断能否在 iframe 里内嵌渲染 PDF。
 *
 * 不能的情况（一律走「打开 / 下载」兜底，避免出现空白或浏览器自带的占位框）：
 * - 微信/微博/QQ/支付宝等内置浏览器：blob PDF 常显示空白
 * - Android / iOS 手机浏览器：Chrome、WebView 都不在 iframe 内渲染 PDF，
 *   只显示一个带 UUID 的灰色占位框和「打开」按钮
 * - 窄屏（< 760px）：即便能渲染，PDF 在手机上也不便阅读
 */
export function canInlinePdf() {
  if (typeof navigator === 'undefined') return true;
  const ua = navigator.userAgent;
  if (/MicroMessenger|MMWEBSDK|Weibo|QQ\/|Alipay/i.test(ua)) return false;
  if (/Android|iPhone|iPad|iPod|Mobile|HarmonyOS/i.test(ua)) return false;
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function')
    return !window.matchMedia('(max-width: 760px)').matches;
  return true;
}

export function isWechat() {
  if (typeof navigator === 'undefined') return false;
  return /MicroMessenger/i.test(navigator.userAgent);
}
