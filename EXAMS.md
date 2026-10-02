# 历年试卷与成绩标签页

路由：`/zikao/course/:code/exams?cycleId=<周期 UUID>`。无 cycleId 时先选择后端返回的考试周期。

## 文件清单

- `src/app/routes.tsx`：将本页占位路由改为真实页面，仅调整 exams 路由。
- `src/pages/ExamsPage.tsx`：页面编排、周期选择、成绩/历史分页、二次确认。
- `src/api/exams.ts`：生成接口的 API 封装、TanStack Query 查询与变更、受控文件下载。
- `src/features/exams/ExamPanels.tsx`：步骤入口、预测、SVG 趋势（含可读数据列表）、分组试卷与成绩记录。
- `src/features/exams/ScoreDialog.tsx`：录入/编辑、明确的三个自报单选、图片验证与单独重试。
- `src/features/exams/exams.css`：页面专属样式；沿用公共设计令牌，不改公共组件行为。
- `src/features/exams/exams.test.tsx`、`test-setup.ts`：10 个组件测试。
- `vitest.exams.config.ts`、`tsconfig.exams.json`：本页独立验证配置。
- `EXAMS.md`：交付记录。

## 运行和验证

在 frontend 目录：

```sh
npm run dev
npx vitest run --config vitest.exams.config.ts
npx vitest run src/features/exams/exams.test.tsx
npx tsc --noEmit -p tsconfig.exams.json
npx eslint src/api/exams.ts src/pages/ExamsPage.tsx src/features/exams --no-warn-ignored
```

已验证：10/10 组件测试；独立类型检查；本页 ESLint；桌面与 390px 手机浏览器预览。手机无横向溢出，步骤条单列。
测试数据仅在组件测试中使用 OpenAPI 示例与 MSW 覆盖；生产页面不注入示例成绩或解锁状态。默认开发 Mock 的试卷、趋势、成绩列表为空，可观察空状态。

组件测试覆盖：加载/空/错误重试，未解锁操作隐藏，窗口内确认和撤销，窗口外无新跳过入口，预测不足与排除原因，三个自报字段、焦点陷阱/Esc/焦点恢复，保存后上传失败不重复创建成绩，编辑乐观锁，受控下载失败重试，历史分数与上海时间。

真实联调需使用非 Mock 环境的登录账号，验证：未解锁直接请求文件端点被拒绝；权限撤销后重新请求被拒绝；实际图片格式与大小服务端校验；编辑修订冲突；考试周期调整后的窗口结果。当前没有完成这些真实后端验证。

## 接口缺口 / 与需求的出入

1. `Unlock` 没有四步各自的状态、具体进度（分子/分母）、当前步骤、说明及行动目标；不能凭 missingChapterIds、权限或前端计数推导这些业务结果。显示“暂未提供”，未输出虚构进度条。第四步只显示 canDownloadPapers 的实际下载权限，不冒充“已完成”。
2. 没有当前需要进入的模拟检测 ID/入口。第一步进入刷题页；第二步进入现有章节列表（含检测入口）；第三步暂回刷题页。不存在独立的检测列表路由。不能达到“跳到对应模拟检测”的要求。
3. `Paper` 不含练习次数、首次成绩、最近成绩汇总。分页成绩列表不能代表所有记录，且前端不能自行选择首次业务成绩。已解锁试卷明确标为暂未提供。
4. `/scores/{scoreId}` 只有 GET/PUT，没有成绩删除接口；没有实现假的删除按钮、确认框或本地删除。附件删除端点不能代替成绩删除。
5. `Prediction` 没有 remainingQualifiedPapers/还需套数。依据用户禁止前端业务计算的约束，不在前端相减，使用“一行至少 3 套、当前已有 x 套”替代“再完成 n 套”。
6. `skipWindow` 仅有 canConfirm，没有独立的 inWindow。新跳过入口由 canConfirm 决定；已有 activeOverride 时展示已跳过与撤销（包括窗口外），因为契约明确考试后活动记录继续有效。若要求窗口外连已有跳过状态都隐藏，需要明确该展示决策并提供独立窗口字段。
7. 旧列表没有分数，已通过只读历史详情接口 oldScore 获取，没有构成缺口；为空显示未提供分数。

未更改 OpenAPI 或生成类型。未重新实现解锁、预测、通过、截止判断。

## 已知问题

- 未找到 CLAUDE.md 和参考截图，无法核对附件的额外规则或视觉细节。
- 全项目类型检查在其他页面报错：manual/highlight、manual/markdown-index、ManualPage 等；本页检查通过，未修改其他页面修复。
- 真实后台权限验证未完成，MSW 测试仅验证前端对拒绝响应的处理。
- 下载按钮仅当前请求显示加载，避免整个清单出现大量相同禁用按钮。
- 表单可 Esc 关闭；已发出的保存请求仍会执行，已成功保存的成绩不会因关闭被回滚。

## 验收自检

1. 不存在 3 个以上相同禁用按钮：通过，锁定清单无下载/录入按钮，下载中只禁用当前操作。
2. 四步状态、具体进度、点击跳转：部分完成。四步可点击，但前三步业务状态/进度及对应模拟目标缺接口；不满足完整验收。
3. 窗口外无手动跳过、窗口内可撤销：新跳过入口与确认/撤销通过测试；窗口外已有状态保留撤销，见接口出入第 6 条。
4. 未解锁无法下载、直接地址后端拒绝：前端通过；真实后端直访拒绝待联调。
5. 三个自报字段与纳入/排除原因可见：通过测试，采用后端 includedInPrediction 与 predictionExclusionReasons。
6. 预测不足不占大版面：通过测试，一行提示，无预测大卡片。
