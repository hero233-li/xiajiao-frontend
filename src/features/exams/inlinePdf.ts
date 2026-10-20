/**
 * 内置浏览器（尤其是微信）常把 iframe 里的 blob PDF 显示成空白，
 * 这类环境直接给出「打开 / 下载」兜底，而不是让用户面对一片黑。
 */
export function canInlinePdf() {
  if (typeof navigator === 'undefined') return true;
  return !/MicroMessenger|MMWEBSDK|Weibo|QQ\/|Alipay/i.test(navigator.userAgent);
}

export function isWechat() {
  if (typeof navigator === 'undefined') return false;
  return /MicroMessenger/i.test(navigator.userAgent);
}
