# 备考总览交付说明

实现位置为当前工作区 `frontend`，路由 `/zikao`。参考工作区旧版预览 `xiajiao/repo/docs/阶段5_前端首页预览.png` 的卡片、留白和课程区结构，按用户本次规范使用蓝色主操作。未找到 CLAUDE.md，用户已同意先沿用旧版。没有修改其他页面或公共组件的既有行为。

## 文件清单

- `src/pages/DashboardPage.tsx`：总览、考试周期选择、四个异步区域与路由标签。
- `src/api/dashboard.ts`：使用生成的 dashboard/exams 请求和 TanStack Query，取消信号、缓存键包含周期和计划。
- `src/components/dashboard/CourseCard.tsx`：可由我的科目页复用，当前我的科目页仍为既有占位页，未修改。
- `src/components/dashboard/ProgressBar.tsx`：后端百分比与无障碍属性。
- `src/components/dashboard/RegionState.tsx`：加载、空、错误与行动。
- `src/features/dashboard/navigation.ts`：结构化目标路由与上海业务日期格式。
- `src/features/dashboard/dashboard.css`：页面隔离设计令牌、交互状态与单列布局。
- `src/features/dashboard/dashboard.test.tsx`、`test-setup.ts`：13 项测试，测试数据仅存在测试文件。
- `src/app/routes.tsx`：仅将 `/zikao` 从占位页替换为新页面，保留登录守卫。
- `index.html`：中文语言、标题及现有主入口。
- `vite.config.ts`：本地预览、Tailwind 和既有 API 代理配置。
- `vitest.config.ts`、`vitest.dashboard.config.ts`、`tsconfig.dashboard.json`：隔离本页测试，汇总已有测试与本页测试。
- `public/mockServiceWorker.js`：现有 MSW worker 的原样副本，供已有开发 Mock 入口加载。仅用于开发演示，不代表真实后端。
- `qa/dashboard-desktop.jpg`、`qa/dashboard-mobile.jpg`：基于 OpenAPI 示例的浏览器截图。
- 本说明文件。

## 运行与验证

Node 22.12–22.x，在 frontend 目录执行：

```sh
npm ci
npm run dev -- --port 5182
npm run typecheck
npm run build
npm run api:check
npm run test
npx vitest run --config vitest.dashboard.config.ts
```

本地访问 `/zikao`。开发 `.env.development` 既有 `VITE_API_MOCK=true` 时可使用页面提供的演示账号。周期列表契约示例为空；为了检查有数据布局，可在演示环境使用 OpenAPI 示例周期地址 `/zikao?cycleId=0ebdbbfe-d607-54b5-9c21-4e0adade5e4c`。周期 ID 没有写入生产页面。真实环境应关闭开发 Mock，并配置 `API_PROXY_TARGET` 或 `VITE_API_ORIGIN`，使用正常登录账号和后端周期。

本页 13 项测试及本页独立 TypeScript 检查通过；生成一致性检查通过。整项目类型检查、生产构建曾通过，但最终整项目类型检查在其他 API 模块出现错误：`src/api/assessments.ts:9` 和 `src/api/practice-selection.ts:9` 将 signal 当作 GetCourseByCodeParams 字段传入。未改动这些模块。全量测试还存在本页之外的 Mock 契约/路由测试失败，见下方。截图中的 18/60、30% 是原契约示例；页面不写死任何计数，组件测试另验证 63/546 的展示。

浏览器验证：390px 下顶部卡片和课程改为单列，无水平溢出；按钮不换行且高度至少 44px；桌面三张课程卡高度相同。无弹窗，焦点陷阱要求不适用；图标入口具备名称，进度具备完整 ARIA 属性。

## 接口缺口

1. `Dashboard` 只有逐科 `countdowns`，没有聚合的理论考试倒计时、理论考试日期区间及实践课日期确认状态。`ExamCycle.startDate/endDate` 是整个周期，不能冒充理论考试日期。因此当前展示逐科后端倒计时与周期范围。
2. `Suggestion` 仅有 `title/reason/taskId/target`，缺任务条目数/题数和“补课/按计划”等后端模式标记；当前原样展示中文摘要，不推断模式或数量。
3. `Course` 缺每课下一学习位置、下一项序号、节奏提示。只有全局 `continueLearning` 的一课可以回到最近位置；其他课禁用精确续学/第一节按钮并显示原因，另提供目录入口。按钮 n/N 当前采用接口的已完成项/总项；不能保证 n 为下一节序号。
4. `Dashboard.courses` 未承诺按考试日期时间升序；页面仅取后端前 3 门，绝不按课程代码或自行排序。后端需补充排序契约才能保证验收。
5. `continueLearning.target` 与 `todaySuggestion.target` 是不同业务目标，契约不保证相等，也没有三个入口共用的权威 `nextStep`。本页使用统一的路由映射，但首页和目录横幅未在本次范围内修改，无法保证三个入口完全一致。
6. 精确课程管理路由未给出；“管理”当前进入既有我的科目路由，不能保证直接打开该课程管理面板。

没有修改 OpenAPI 或生成类型，没有在生产代码补造业务字段。

## 已知问题

- 我的科目、35 天安排、备注和课程页在当前基础工程中仍为占位页；本次只实现总览，链接可进行真实路由导航，但目标功能由相应页面实现。
- 尚未连接真实后端，浏览器布局使用既有 OpenAPI Mock 示例。其周期列表为空而 dashboard 示例有周期，所以普通演示入口显示空周期状态。
- 全量测试中 `src/mocks/mocks.test.ts` 的 `listNoteTags` 目前被备注详情 Mock 匹配，响应与契约不一致；`src/app/routes.test.tsx` 的某个未登录深链接测试也曾进入路由错误态。没有修改这些公共业务行为；本页测试独立通过。

## 验收自检

| 验收项 | 结果 |
| --- | --- |
| 首页、今日建议、目录横幅下一步完全一致 | 受接口和范围限制，未通过跨页验收；本页路由映射保留稳定目标 ID |
| 科目严格按考试时间排序 | 保留后端顺序已验证；后端排序契约缺失，无法承诺时间升序 |
| 0% 不显示空进度条 | 通过组件测试 |
| 标签前进/后退、刷新停留当前路由 | 本页使用真实路由链接，历史导航与参数测试通过；目标页面功能仍为占位 |
| 窄屏两卡上下排、信息不截断 | 390px 浏览器实测通过；按钮不换行，无水平溢出 |
