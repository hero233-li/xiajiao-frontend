# 验证结果

验证日期：2026-10-07。实际前端为repo/frontend，后端为repo/backend。本地预览：<http://127.0.0.1:5173>，代理后端8080。本次没有发布生产、重置仓库或改写历史业务数据。

## 自动检查

| 检查 | 结果 | 覆盖 |
|---|---|---|
| 前端类型检查 / 生产构建 | 通过 | TypeScript两个工程与Vite按需加载构建 |
| 前端单元与交互测试 | 34个测试文件，280项通过 | 原学习、题库、健身流程；空间注册、规模、故障隔离与多表单未保存保护 |
| 本次新增平台代码静态检查 | 通过 | 注册表、摘要、框架、目录、共享日期与未保存组件 |
| 后端单元测试 | 41项通过 | 原权限及业务规则、可信空间配置与API可用性校验 |
| SpacePreferencesMySqlIT | 2项通过 | 用户隔离、偏好版本冲突、排序事务、近期访问、未上线拒绝、非法请求 |
| FitnessHttpMySqlIT | 7项通过 | 真实HTTP业务规则、幂等、记录版本与浏览器完整业务流程 |
| BankImageGradingMySqlIT | 3项通过，1项跳过 | 图片答案保存/恢复、完整提交约束、图片绑定与格式校验、批改回调原子性及幂等 |
| axe WCAG A/AA检查 | 7个场景，0项违规 | 首页、空间目录、今日任务在390/1440宽度，以及空间切换弹窗 |

后端集成测试使用隔离MySQL容器，不使用integration账号写入业务数据。外部Codex真实批改工作进程的可选测试依赖BANK_REAL_CODEX，本次未启用；因此不声称本次重新验证了外部模型端到端运行。原批改能力和接口继续保留，页面入口、上传/保存/提交规则及结果写入链路已分别验证。没有运行全部mysql-it套件，表中是本次有报告的相关测试。

## 真实浏览器验收

使用Playwright真实Chromium和已授权integration账号连接本地后端，非页面截图模拟。

- 首页、目录、今日、自学、健身、管理员：390/768/1440共18个场景，无整体横向溢出，标题正确，无页面运行异常。见[initial-browser.json](evidence/initial-browser.json)。原业务权限返回的403仍被保留，没有为了截图放宽访问权限。
- 收藏、隐藏、排序刷新与重新登录后保留；检查后还原原偏好。近期访问恢复原日期，切换面板Esc关闭恢复焦点。真实草稿阻止切换，取消后输入仍在。见[workflows.json](evidence/workflows.json)，26项通过。
- 旧/zikao学习链接跳转到/study，保留查询与锚点；真实阅读、题库、真题与批改入口；课程目录、练习、真题、训练计划编辑、课程管理、题库管理在三种宽度下可用。
- 单独对学习摘要注入503，健身仍显示真实任务和目标链接，学习显示自己的失败及重试。此项明确属于故障注入，见[partial-failure.png](evidence/partial-failure.png)。其余真实流程没有接口替身。
- 未上线考研、雅思不出现加入按钮、任务、进度或无效业务链接。
- 隔离数据库浏览器完整执行阅读完成、训练安排与个人模板、实际训练完成、食谱与实际饮食、体重创建编辑、饮水打卡、首周计划事务导入与后续编辑、统一账号资料、刷新/重新登录、其他用户隔离。见[isolated/browser.json](evidence/isolated/browser.json)，12组流程通过，mockRoutes=0。
- [accessibility.json](evidence/accessibility.json)记录平台无障碍检查；键盘焦点恢复和取消未保存编辑另由实际交互检查验证。自动检查不代替人工屏幕阅读器审计。

## 空间扩展验收

[scale.json](evidence/scale.json)记录2、6、12个目录项 × 390、768、1440宽度，共9个通过场景。所有额外项明确写为“测试配置”且“即将开放”，没有新增上线业务。搜索、过滤及无横向溢出都已验证。

注册表测试另使用明确标注的可用测试模块验证2/6/12个个人空间、收藏/隐藏/排序、切换检索，以及新增一个模块后直接被首页消费。`src/spaces/testing.ts`和`modules/test-only.tsx`只用于测试；线上注册表没有这些模块。平台首页、导航及已有空间无需增加业务条件分支。

## 数据与废弃代码

新V62只增加user_space_preference，收藏、排序、隐藏和加入绑定当前用户，可信目录和后端业务鉴权共同控制访问。隐藏/退出入口没有删除业务数据。旧个人聚合接口继续兼容，新首页分空间独立请求。

移除原首页巨大空间卡片结构与对应home样式，迁移健身专用未保存守卫为平台共享守卫；学习路由抽到独立模块，管理从自学布局脱离。保留原课程、动作、答卷等业务组件及原完成规则。仓库原先及其他工作中的未提交变更均未重置；其数据库迁移仍按原机制执行，未混入本次V62。

## 复验方式

前端执行`npm run test`、`npm run build`。后端执行`mvn test`与`mvn -Pmysql-it -Dit.test=SpacePreferencesMySqlIT,FitnessHttpMySqlIT,BankImageGradingMySqlIT verify`，需要项目既有Docker/MySQL测试环境。

在前端目录，设置GROWTH_PASSWORD环境变量后执行以下脚本；不要把密码写入脚本或提交到仓库：

- `node scripts/growth-browser-check.mjs`：真实页面与响应式截图。
- `node scripts/growth-workflows-check.mjs`：真实偏好、切换、未保存保护与局部故障。
- `node scripts/growth-scale-check.mjs`：明确标记的规模夹具。
- `node scripts/growth-accessibility-check.mjs`：平台WCAG检查。

[主要页面截图](screenshots.md) · [设计规范](design.md) · [功能映射](mapping.md) · [空间接入说明](space-integration.md)
