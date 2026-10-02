# 刷题章节选择层

入口：`/zikao/course/:code/practice?cycleId=<后端周期 UUID>`。未传考试周期时先选择后端返回的周期，因为课程代码查询要求 `cycleId`。所有章节 URL 使用后端 `chapterId`，序号只用于列表显示。

## 实现范围

- 统计卡：后端已答数、题库数、正确率、错题数。
- 章节列表：题目进度、稳定章节 ID 导航、后端通过状态和检测阻塞原因。
- 章节刷题、真题变种切换保存在 URL；真题变种不施加章节门槛。
- 错题重做：进入 `filter=WRONG` 模式，请求真实错题列表，支持分页和指定题目跳转；零错题按钮禁用并关联“暂无错题”说明。
- 检测申请：选择周期、调用章节检测申请接口、使用幂等键重试，显示后端拒绝原因。弹窗复用现有焦点陷阱及焦点恢复逻辑。
- 加载、空状态、错误重试；页面最大宽度 960px，768px 以下单列，所有按钮不换行且触控尺寸至少 44px。
- 错题题干使用既有 KaTeX 懒加载组件。
- 没有侧栏和目录进度数字；公共组件行为、OpenAPI 和生成类型均未修改。

## 验证

在本目录运行：

```sh
npm run dev
npx vitest run --config vitest.practice-selection.config.ts
npx tsc --noEmit -p tsconfig.practice-selection.json
npx eslint src/api/practice-selection.ts src/pages/PracticeSelectionPage.tsx src/features/practice/selection.test.tsx src/features/practice/test-setup.ts vitest.practice-selection.config.ts
npm run build
```

组件测试使用隔离的 MSW 后端响应，不向生产接口写入数据。测试覆盖导航、错题筛选、异步三态、申请失败重试及幂等键、焦点陷阱和 Esc 关闭。

浏览器预览使用项目现有开发 Mock。真实后端联调时关闭 `VITE_API_MOCK` 并配置项目既有 API 代理。

## 接口缺口与当前处理

1. `PracticeChapter` 没有推荐字段：不推测推荐章，所有章节“开始”使用描边按钮。验收要求的唯一主色推荐按钮暂不能满足。
2. 没有后端续练状态或续练位置：不按已答题数判断，统一显示“开始”。
3. `PracticeStats` 没有后端剩余开放题数：不使用 `gateThreshold - answeredOriginalCount` 推算，显示 `canApplyChapterAssessment` 和原始 `blockReasons`。若后端原因未含数字，“再答 n 题开放”暂不能满足。
4. 检测阻塞原因是无枚举约束的 `string[]`：逐字显示非空原因，并禁止申请；无法可靠将未文档化原因码转换为“题量不足”。需要后端返回中文说明，或明确的状态枚举及文案字段。
5. 章节通过标志、通过记录没有关联分数或具体检测会话：仅显示“已通过”，不从历史检测中猜测哪次成绩代表通过分数。
6. 没有每日建议题数：不展示。
7. 没有个性化新题接口：不展示该入口。

## 已知问题

- 工作区未找到用户提到的 `CLAUDE.md`，无法核对其附加规则；按用户消息及 `docs/openapi.yaml` 实现。
- 真题变种入口按约定跳转 `/zikao/course/:code/practice/variant`，但现有路由尚无专门的变种做题页面，动态章节做题路由会捕获该地址。需要后续做题界面任务接入，此次未改动做题页。
- 本页使用页面原生 `<progress>` 的 `value/max` 展示后端已答数和总题数，不另行生成进度百分比或判断完成。

## 验收自检

| 验收项                                 | 结果                                                |
| -------------------------------------- | --------------------------------------------------- |
| 唯一主色开始／继续按钮，且推荐章有标签 | 接口阻塞：缺推荐字段；未伪造推荐                    |
| 错题重做可用，无错题时说明原因         | 通过：真实 WRONG 列表、稳定章节及题目跳转、禁用原因 |
| 未开放明确展示还差多少题               | 接口阻塞：原样展示后端原因；缺明确剩余题数时不推算  |
| 不并列展示目录进度数字                 | 通过：只展示题目统计和题目进度                      |
| URL 不使用 ch01 类序号                 | 通过：章节使用后端稳定 UUID                         |
