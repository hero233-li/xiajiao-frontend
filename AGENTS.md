# frontend-v2 写作规范（xiajiao 新前端）

本工程的视觉基准来自两份本地资料，任何新页面都必须遵守：

- `~/IDEA/git综合/流光玻璃视觉规范项目/`：Apple Liquid Glass 材质（流光玻璃）的 token 与检查清单
- `~/IDEA/git综合/UI设计审美项目/`：10 条 UI 规则（+ 第 11 条）与可复制的审查清单

## 一、硬约束（A1–A11）

| 编号 | 规则 |
|---|---|
| A1 | 文案中不得用中点「·」当分隔符 |
| A2 | 不加冗余解释性描述文本（删掉用户仍能理解 = 冗余，删） |
| A3 | 文案贴合自考考生人群，不生造词、不过度口语 |
| A4 | **颜色只从 Radix UI Colors 取**（已 `@import` 在 `src/main.tsx`），按 step 语义用：背景 1–2、组件 3–5、边框 6–8、实体色 9–10、正文 11–12 |
| A5 | 对齐做光学修正；嵌套容器圆角同心（内 = 外 − 内边距） |
| A6 | 边框 0.5px（`--glass-hairline`）；玻璃外沿用 1px 亮边 |
| A7 | 动画只留必要反馈，统一 `--ease-out` / `--duration`(250ms)；装饰性过渡删除 |
| A8 | 字号 ≤ 3 种：22（页面标题）/ 15（正文与输入）/ 13（说明与标签），最小 12px |
| A9 | 少让用户做判断：能默认就默认，必须选时前置默认值 |
| A10 | 不随手用圆角/阴影；**严禁卡片左边缘彩色竖线** |
| A11 | 不加与主标题语义重复的 Eyebrow / Overline 小标签 |

## 二、可用的样式类（`src/styles/index.css`）

- `.glass` 玻璃卡片（22 圆角 + 模糊饱和 + 亮边 + 极淡外阴影），`.glass--sheen` 追加流光
- `.pill` 玻璃药丸；`.pill--solid` 实心靛蓝胶囊（主按钮/选中态）
- `.field` 输入框（同心圆角 14）
- `.nav-capsule` / `.nav-item`（`data-active='true'` 为选中态，展开成实心胶囊）
- `.page-title` / `.page-note` 页面标题与说明

语义色：`text-secondary` `text-muted` `text-ink` `text-brand` `text-danger` `text-warn`
`text-accent-orange` `text-accent-blue` `text-accent-green`；底色 `bg-canvas` `bg-surface` `border-line`

## 三、玻璃的验收项

- 玻璃必须在**真实背景**上验证，不能在纯白底上判断（背景已由 body 的环境渐变提供）
- 文字与背景对比度 < 4.5:1 时该层回退不透明底（`--glass-fill-strong`）
- `prefers-reduced-motion` 下停掉流光；流光周期 6s
- focus 环单独给 2px 高对比描边（已在 `:focus-visible` 统一）

## 四、工程约定

- 数据层只用 `src/lib/api.ts`（cookie 无关的 Bearer + 自动刷新），不要另起 axios 实例
- 页面按用户逐页指令重写，不要一次性铺开所有路由
- `npm run dev` = 127.0.0.1:5173（代理线上 API）；`npm run build` 必须过 `tsc --noEmit`
