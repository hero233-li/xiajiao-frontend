# 知途个人平台前端

[设计规范](design.md) · [增量接口](openapi.yaml)

页面：个人首页、自学空间（含原课程阅读/练习/检测/笔记/计划/成绩及管理员）、健身今天、目标、周训练计划与模板、食谱与饮食、体重、打卡历史、账号设置。

运行与迁移、接口覆盖和验证报告见相邻后端 `backend/docs/platform/`。真实Spring Boot + 隔离MySQL的桌面/手机截图与请求记录位于[evidence](evidence/browser.json)，不是Mock展示。

前端模型从后端FitnessModels.java生成：`python3 scripts/generate-fitness-types.py --check`。加载、错误重试、空记录、重复日期编辑、保存中、冲突提示、删除确认、未保存提醒和登录恢复遵循统一交互。
