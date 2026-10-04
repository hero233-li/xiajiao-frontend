# 功能与新入口映射

前端位于 frontend。React 18、TypeScript、Vite、React Router 数据路由、TanStack Query。开发 npm run dev；检查 npm run typecheck / npm test / npm run build。真实接口 /api/v1 代理至 Spring Boot；Mock关闭。
验收前端5175、后端8082、MySQL副本13328；原服务与原数据库保留。

| 原功能                                 | 新入口                                   | 真实接口及保留规则                           |
| -------------------------------------- | ---------------------------------------- | -------------------------------------------- |
| 登录、恢复会话、退出                   | /login，全局账号菜单                     | auth/session，原权限与注册策略               |
| 资料与偏好                             | /settings                                | fitness/records/profile，修订冲突保护        |
| 今日具体学习目标                       | 首页 → 开始这一项                        | personal/summary Navigation，稳定目标ID      |
| 今日清单、上次位置、错题               | /study                                   | dashboard，learning-position，practice       |
| 课程、报考、考试日期                   | /study/courses                           | courses/enrollments/cycles                   |
| 阅读、目录进度、资源                   | 课程 → catalog                           | catalog/completion，整章与逐项完成           |
| 知识、搜索、熟练度、备注               | 课程 → knowledge                         | knowledge，原草稿与修订                      |
| 手册、目录、代码                       | 课程 → manual                            | manual，真实Markdown                         |
| 章节/错题/收藏/存疑练习                | 课程 → practice                          | practice，幂等作答与解析                     |
| 检测、计时、自动交卷、结果             | tests/:id，tests/:id/result              | assessments，服务端截止与答案队列            |
| 笔记、搜索、快捷备注                   | /study/notes，课程notes                  | notes，冲突与离开保护                        |
| 计划、版本、顺延、完成                 | /study/schedule                          | schedule，预览确认与真实统计                 |
| 真题、成绩、预测、历史修订             | 课程 → exams                             | exams，私有文件与原统计口径                  |
| 答卷批改、Mac配对、任务与结果核对      | exams → 答卷批改                         | grading/local-grading，任务与审核状态        |
| 今日健身、体重、饮水、打卡             | /fitness                                 | days/records，分项保存                       |
| 目标与历史                             | /fitness/goals                           | goals，历史保持                              |
| 周训练、实际训练、复制                 | /fitness/training，edit/:kind            | training-plan/training分离，实际状态明确填写 |
| 食谱与实际饮食                         | /fitness/meals，edit/:kind               | meal-plan/meals分离，营养null表示未知        |
| 体重、趋势、精确历史                   | /fitness/weight                          | history/statistics，不补齐缺失记录           |
| 日历、周/月统计、详情                  | /fitness/history                         | 独立查询重试                                 |
| 第一周、训练/周/食谱模板               | /fitness/templates                       | 保留模板编辑、覆盖确认                       |
| 课程、考试周期                         | /admin?view=courses/cycles               | 原ADMIN权限                                  |
| 版本、任务模板、目录、知识、题库、政策 | /admin?view=content                      | 草稿修订、校验、发布与历史版本               |
| 文件、试卷、评分标准                   | /admin?view=files/papers/rubrics         | 私有文件与评分版本                           |
| 告警、通过审核、作答审核、审计         | /admin?view=alerts/reviews/credits/audit | 原审核接口与状态                             |

设计方向：任务桌面。横向空间切换；阅读与作答以正文为中心，目录按需展开；健身围绕日期；管理围绕列表、版本与工作步骤。说明14px起，阅读16px起，触控44px。所有入口连接真实接口，不增加无关后端业务。
