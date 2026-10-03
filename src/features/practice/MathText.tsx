import { useEffect, useRef } from 'react';
import { MathText as Content } from '../../components/MathText';

// 保留原始数学内容，让超宽公式也能用键盘横向阅读。
export function MathText({ text }: { text: string }) {
  const root = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const update = () => {
      element.querySelectorAll<HTMLElement>('.math-text, .katex-display').forEach((region) => {
        const scrollable =
          !region.closest('button') &&
          (region.scrollWidth > region.clientWidth || region.classList.contains('katex-display'));
        if (scrollable) {
          region.tabIndex = 0;
          region.setAttribute('role', 'region');
          region.setAttribute('aria-label', '数学内容，可横向滚动阅读');
        } else {
          region.removeAttribute('tabindex');
          region.removeAttribute('role');
          region.removeAttribute('aria-label');
        }
      });
    };
    const mutations = new MutationObserver(update);
    mutations.observe(element, { childList: true, subtree: true });
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    resize?.observe(element);
    window.addEventListener('resize', update);
    update();
    return () => {
      mutations.disconnect();
      resize?.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [text]);
  return (
    <span ref={root} className="practice-math">
      <Content text={text} />
    </span>
  );
}
