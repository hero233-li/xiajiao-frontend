# 管理工作台交付与联调记录

管理员页面：`/admin`。仅 ADMIN 账户显示管理入口；直接访问仍经过身份与角色校验，所有写入由后端再次授权。

实际前端目录为 `frontend`，React / TypeScript / Vite；后端为 `backend`，Spring Boot / MySQL。管理页面不使用 Mock。现有用户数据与原计划没有删除或迁移。

## 页面与接口清单

以下路径均省略 `/api/v1`。

| 管理任务 | 读取接口 | 可执行操作与写入接口 |
| --- | --- | --- |
| 课程维护 | `GET /admin/courses?cycleId=&page=&size=`（本次补充，可省略周期读取全目录，包括停用课程） | `POST /admin/courses?cycleId=`；`PUT /admin/courses/{courseId}?cycleId=`：名称、支持的课程代码、理论/实践类型、启用状态 |
| 考试周期 | `GET /exams/cycles`；课程选择使用管理员全目录 | `POST /admin/exams/cycles`；`PUT /admin/exams/cycles/{cycleId}`：名称、起止日期、已有课程与考试时间 |
| 内容版本 | `GET /admin/courses/{courseId}/releases` | `POST /admin/courses/{courseId}/releases`：明确传入 `basedOnReleaseId` 和 `sourceSha`（可为 null）；基于当前发布版复制完整草稿 |
| 学习目录 | `GET .../releases/{releaseId}/catalog` | 同路径 PUT：章节、条目、预计时间、目录资料与实践手册关联 |
| 知识内容 | `GET .../releases/{releaseId}/knowledge` | 同路径 PUT：模块、考点、正文、公式、代码、例题及资料关联 |
| 题库 | `GET .../releases/{releaseId}/questions` | 同路径 PUT：题干、选项、答案、解析、章节/考点关系、原创审核；本地筛选与分页，提交保留全部题目 |
| 检测策略 | `GET .../releases/{releaseId}/assessment-policy` | 同路径 PUT：门槛、题量、限时、通过分数、章节权重及审核确认 |
| 计划任务模板 | `GET .../releases/{releaseId}/task-templates` | 同路径 PUT **完整清单**：新增/编辑/删除/排序；REVIEW 名称和分钟数由管理员填写，资料从合法已存在内容选择 |
| 校验与发布 | `GET .../releases/{releaseId}/validation` | `POST .../releases/{releaseId}/publication`，`confirm=true`；写入携带 `If-Match`，先保存最新修改，再获取最新校验 |
| 文件资料 | `GET /admin/files` | `POST /admin/files` multipart：文件、purpose、containsAnswers；PAPER 接受 PDF，MANUAL 接受结构化 JSON，文件限制 8MB |
| 试卷维护 | `GET /exams/courses/{courseId}/papers?cycleId=&page=&size=` | `POST /admin/exams/courses/{courseId}/papers`；`PUT .../papers/{paperId}`：年月、题目/答案文件、页数、备注；文件 ID 从真实文件列表选择 |
| 评分标准 | `GET /grading/rubrics?courseId=&cycleId=&paperId=` | `POST /grading/rubrics?courseId=&paperId=`；`PUT /grading/rubrics/{id}`；`POST /grading/rubrics/{id}/publish`：人工维护题目、答案、分值与评分点；发布版只读，可复制草稿 |
| 检测告警 | `GET /admin/practice/alerts?courseId=&page=&size=` | `POST /admin/practice/alerts/{id}/acknowledgement`，`confirm=true`；确认后禁止重复提交 |
| 历史通过审核 | `GET /admin/exams/legacy-pass-reviews?courseId=&page=&size=` | `POST .../{reviewId}/decision`：ACCEPT/REJECT、原因、合法映射；已审核决定不重复修改；有 passId 的记录可 `POST /admin/practice/passes/{passId}/invalidation`，说明原因并确认 |
| 历史作答审核 | `GET /admin/practice/legacy-credits?courseId=&page=&size=` | `POST .../{legacyId}/decision`：是否计入门槛、已审核章节原创题映射、原因和确认；不伪造新作答记录 |
| 审计记录 | `GET /admin/dashboard/audit-events?action=&page=&size=` | 只读分页、操作类型筛选、展开原因及详情。接口没有审计修改能力 |

列表筛选明确区分“筛选本页记录”和审计的服务器筛选。分页请求遵守后端 size 上限；下拉关联资料读取完整分页目录。

## 补齐 REVIEW 与发布

1. 进入管理工作台，选择考试周期及理论课，在“内容发布”查看当前发布版本。
2. 点击“基于当前版本创建草稿”，在“计划任务”新增复习任务。名称、预计分钟数必须人工填写；不自动填 60 分钟。
3. 保存时提交原有任务和新增任务的完整清单，保留标识、类型、排序、资料关联等字段。删除前显示具体任务名，保存前可撤销。
4. 点击“保存并校验”，查看独立的校验结果区并处理阻断问题。未保存或校验未通过不能发布。
5. 确认启用版本。成功后版本列表、当前版本和覆盖情况刷新；失败保留草稿与修改。
6. 四门理论课逐一完成。当前后端五周规则要求每门课存在 REVIEW；PAPER 不替代 REVIEW。
7. 点击“返回学习计划预览”，重新预览读取新发布模板。正式计划需要用户自行确认，发布内容不自动替用户保存新计划。

## 本次查出并修复的问题

- 试卷列表及评分标准的试卷选择请求遗漏必填 cycleId，造成“请求参数不合法”。现使用生成的接口类型与真实必填参数。
- 编辑试卷时读取的是嵌套文件元数据，写入必须传 questionFileId/answerFileId；修正映射并保留未修改的可空字段。
- 原生年月输入在联调中改变画面值却未同步表单状态；改为按契约校验的 YYYY-MM 文本输入。
- 考试周期及计划日期输入同样存在状态同步问题；补齐 input 事件，已通过浏览器保存回读及回归测试。
- 评分标准的管理员读取被错误套用学习端真题解锁规则；管理员现在校验周期/课程关系后读取，普通用户继续受原解锁和报考规则限制。
- 版本列表查询对包含 1202 道题的大 JSON 草稿使用 SELECT *，触发 MySQL 排序内存错误；改为只查询列表需要的版本元数据。
- 学习端计划说明宣称自动提供 60 分钟复习，与实际后端强制 REVIEW 模板规则不一致；说明已修正。
- 历史作答映射曾列出未审核题目；现在仅列出符合后端规则的已审核章节原创题，空列表提供可执行提示。
- 审计列表曾使用错误的 createdAt/actorUserId 字段；改为真实 occurredAt/actorId，详情可展开。
- 模板第一列上下堆叠而其他列顶端输入，导致不齐；改为类型、名称、分钟、资料、操作五列，控件 36px 同高同顶部。保存/校验/发布按钮按顶部对齐，帮助文案不会推高相邻按钮。
- 管理页顶部品牌与内容左边界统一；移动端导航换行，表格局部滚动，不让整个页面横向溢出。

## 真实验证

独立 MySQL 容器 `xuexi-admin-qa-20261003`，数据库 `admin_qa`，后端 8088、前端 5188；与原 8080/5173 环境隔离。测试内容只发布到独立库。

浏览器实际操作完成：

- 高等数学当前版本复制草稿，原目录、知识、1202 道题及原 PAPER/REVIEW 完整保留；新增 REVIEW，分钟数从 90 改为 95，选择已有 OpenStax 资料，上移排序，保存后回读一致。
- 校验通过并发布 v6；再次复制草稿、审核一项章节原创题，保存完整题库并发布 v7；其余题目数量和全部任务模板保留。
- 上传合法测试 PDF，新增 2026-09 试卷，修改备注并回读，文件关联保持正确。
- 新建评分标准、录入题目/答案/100 分及合法评分点、保存回读并发布，发布版只读。
- 保存课程；考试周期开始日期从 2026-10-01 改为 2026-09-30 后真实回读成功。
- 告警确认、历史模拟通过审核、历史作答认领实际提交成功；审计记录包含相应操作与原因。
- 返回五周计划重新预览：新增 95 分钟复习被读取；预览调整为考前 2026-09-19 至 2026-10-23 后，第五周排入 9 小时 15 分钟真题复习。没有点击确认保存，原计划仍为版本 1。
- 普通 USER 直接访问 /admin 显示无权限；后端测试同时验证 ADMIN 接口与发布操作对 USER 返回 403。
- 模板每行全部控件 top 一致、height=36；管理页桌面品牌/内容左边界均为 72px。390px 手机视口的整页 scrollWidth=390，宽表格仅在自己的容器滚动。

自动检查：管理员及路由相关 28 项测试通过；前端稳定验证副本全量 243 项通过、类型检查与构建通过；后台单元测试 30 项通过、管理员发布 MySQL 测试 2 项通过、其他管理能力 MySQL 测试 13 项通过。OpenAPI 再生成一致性、管理表单契约提取一致性、修改文件 lint 均通过。

### 当前工作区的独立阻断项

验证期间工作区同时新增另一套个人平台/健身页面。为保留这些未完成修改，管理员端使用固定副本继续浏览器验证，不覆写新平台页面：

- 主路由已引用 PersonalPage / SettingsPage，但文件尚未存在，当前工作区整仓类型检查不能通过。
- 新增 V11__personal_platform.sql 的 fitness user_id 与 app_user.id 外键字符集/排序规则不一致，空数据库迁移失败。管理员隔离回归使用新增该模块之前的 V1–V10 基线，加上本次管理员改动。
- 全仓 lint 中另有既有浏览器脚本的 URL 全局声明问题；本次修改文件检查通过。

这些是当前工作区新增模块的整仓阻断项，不能把管理员隔离验证等同于当前工作区的全量发布验收。原后端未被重启，也没有向原数据库发布测试内容。

## 实际接口边界

- 后端课程代码限制为现有六门，不能任意创建新代码；六门均存在时新增按钮说明原因，已有课程仍可编辑/停用/重新启用。
- 历史审核接口目前按当前管理员自身的导入记录读取，不是跨用户审核队列；管理页面遵守现有权限。跨用户历史审核需要后端明确扩展接口与授权范围。
- 没有全局管理员通过记录列表，因此仅能在已有历史审核返回 passId 时执行作废；不提供猜 ID 的作废入口。
- 没有管理员文件删除、用户权限管理、报名/收费管理接口，不提供假按钮。文件与手册使用现有支持的上传/关联能力。
- 批改工作机的配对及任务属于现有学习端工作机流程；本工作台实现人工评分标准维护，不虚构全局工作机管理接口。

## 截图

- [内容发布及对齐](admin-evidence/published-workspace.jpg)
- [任务模板草稿编辑](admin-evidence/draft-editor.jpg)
- [试卷维护](admin-evidence/papers.jpg)
- [评分标准发布](admin-evidence/rubrics.jpg)
- [五周计划预览](admin-evidence/plan-preview.jpg)
- [真实审计记录](admin-evidence/audit.jpg)
- [手机管理页](admin-evidence/mobile.jpg)
- [普通用户无权限](admin-evidence/user-forbidden.jpg)
