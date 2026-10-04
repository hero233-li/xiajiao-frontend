# 后端重构适配

真实后端位于相邻backend仓库，完整交付见 `../backend/docs/refactor/06-delivery.md`。

客户端与Mock生成统一使用本仓库 `docs/openapi.yaml`（106个操作），与后端快照一致。成绩创建发送稳定Idempotency-Key，编辑继续发送expectedRevision；成绩编辑窗可读取真实修订历史。图片仍为个人存档，不创建自动评分任务。

运行需要Node22.12–22.x。开发设置API_PROXY_TARGET为本地后端、VITE_API_MOCK=false，执行npm run dev。部署构建执行npm run build并代理/api。现有部署脚本及页面设计保留。

npm run api:check、npm test、npm run build完成验证。后台RefactorHttpMySqlIT从真实页面测试登录、目录、成绩与图片上传、成绩修订和历史；需要已安装Playwright Chromium，环境没有浏览器时先执行npx playwright install chromium。该测试使用独立MySQL，不依赖正式账号。

原前端没有完整管理编辑页；管理生成客户端更新不等于管理UI已实现。缺少管理员复习模板时计划创建展示后端提示，不能使用Mock默认任务掩盖该状态。


后续已实现独立答卷及Mac本地Codex批改，网页入口为真题与成绩→答卷批改。前端与后端、独立MySQL和本地Codex的真实链路已通过；实现、安装、迁移及验证范围见相邻backend/docs/grading-delivery.md。新类型引用OpenAPI生成的Local*类型，旧照片接口不会隐式申请批改。
