# 知途个人成长平台重构

[功能映射](mapping.md) · [设计规范](design.md) · [空间接入](space-integration.md) · [验证结果](verification.md)

前端 React / 后端 Spring Boot 两个独立仓库均有新增代码。本次保留已有题库、答卷批改、健身及管理员未提交业务修改，没有发布到生产。

## 运行

后端：先配置项目已有`.env.integration`与本地MySQL，在backend执行`mvn -DskipTests package`，回到repo执行`sh scripts/start-backend-dev.sh`。

前端：在frontend执行`API_PROXY_TARGET=http://127.0.0.1:8080 npm run dev -- --port 5173`。本地开发已有`.env.development.local`指向18082，显式环境变量会覆盖它；使用其他后端端口时调整该环境变量。

本次新增Flyway V62，只创建用户空间偏好表；启动仍按项目原有机制执行其他尚未应用的迁移。新接口文档位于`backend/docs/growth-platform/openapi.yaml`与`api.md`。原`/personal/summary`为旧客户端保留；新首页按模块读取`/personal/study-summary`与现有健身接口，实现故障隔离。

## 验证

- `npm run typecheck`、`npm run test`、`npm run build`。
- `mvn test`，`mvn -Pmysql-it -Dit.test=SpacePreferencesMySqlIT,FitnessHttpMySqlIT,BankImageGradingMySqlIT verify`。
- 使用已授权integration账号运行`growth-browser-check.mjs`与`growth-workflows-check.mjs`，密码通过GROWTH_PASSWORD环境变量传入，脚本不保存密码或令牌。
- 隔离MySQL完整业务浏览器脚本由FitnessHttpMySqlIT启动，测试账号与数据只在容器中存在。

所有截图与结构化结果见[evidence](evidence/)。其中规模夹具和故障注入均明确标注，不冒充生产上线空间。

[主要页面截图](screenshots.md)提供首页、目录、今日任务、自学阅读、健身及管理页面的桌面与手机截图。
