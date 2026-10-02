import { useLocation } from 'react-router-dom';
const gaps = [
  ['课程卡下一位置', 'GET /api/v1/courses → items[].next', '/zikao、/zikao/courses'],
  ['当前周期标记', 'GET /api/v1/exams/cycles → items[].isCurrent', '/zikao'],
  ['四步状态和进度', '解锁步骤状态端点（待定义）', '/zikao/course/:code/exams'],
];
export function CapabilityDebug() {
  const location = useLocation();
  if (!import.meta.env.DEV) return null;
  return (
    <footer>
      <details>
        <summary>缺失接口 · 开发诊断</summary>
        <p>当前页面：{location.pathname}</p>
        <ul>
          {gaps.map(([name, path, page]) => (
            <li key={name}>
              {name} · {path} · 页面 {page}
            </li>
          ))}
        </ul>
      </details>
    </footer>
  );
}
