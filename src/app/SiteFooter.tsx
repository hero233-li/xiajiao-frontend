/**
 * 站点页脚：备案信息。
 * ICP 与公安备案的号码沿用原站，勿改；公安备案的图标是国家平台要求备案时同步展示的。
 */
export function SiteFooter() {
  return (
    <footer className="flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 pt-6 pb-10 text-[12px] sm:px-6">
      <span className="text-muted">菲比啾比卷卷卷</span>
      <a
        className="text-muted hover:text-secondary transition-colors"
        href="https://beian.miit.gov.cn/"
        target="_blank"
        rel="noopener noreferrer"
      >
        蜀ICP备2026061522号
      </a>
      <a
        className="text-muted hover:text-secondary flex items-center gap-1.5 transition-colors"
        href="https://beian.mps.gov.cn/#/query/webSearch?code=51011202001535"
        target="_blank"
        rel="noopener noreferrer"
      >
        <img src="/public-security-beian.png" alt="" width={16} height={16} />
        川公网安备51011202001535号
      </a>
    </footer>
  );
}
