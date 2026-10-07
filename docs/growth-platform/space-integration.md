# 空间接入说明

## 文件与职责

- 后端可信目录：`backend/src/main/resources/spaces/catalog.json`。目录包含稳定id、名称、介绍、图标键、辅助色、entry、order、visible、status、permission、defaultJoined及apiPrefixes。
- 注册与权限：`SpaceCatalog`启动校验配置；`SpaceAccessConfiguration`对匹配的业务API进行可用性与权限检查，原认证与业务权限继续执行。
- 前端模块契约：`src/spaces/types.ts`，统一SpaceModule接口。
- 前端模块注册：`src/spaces/registry.tsx`。每个模块声明id、entry、内部navigation、懒加载routes和load。
- 摘要适配器：`src/spaces/modules/study.tsx`与`fitness.tsx`；只读取真实业务接口，返回SpaceSummary、TodayTask与模块自身Summary组件。
- 平台首页与导航只消费注册表、可信目录和用户偏好，不按空间id判断业务。

## 新增一个空间

1. 后端目录新增稳定id（以后不要改名）、可信状态与权限、API前缀。开发中设COMING_SOON且entry=null，禁止提供模拟任务或进度。
2. 实现独立业务模块及其后端资源权限，沿用当前用户身份，不新增认证系统。
3. 新建前端模块，声明内部导航与按需加载页面路由。摘要实现loadSummary(signal)，用真实日期、状态、稳定任务id与目标链接。无任务则返回tasks=[]并给出有效的设置入口。
4. 在spaceModules增加一条注册。无需改PersonalPage、TodayPage、PlatformLayout及其他空间模块。
5. 实现Summary组件，只渲染摘要，空间业务页面可以有完全不同的结构。
6. 将可信目录状态改为AVAILABLE，entry与模块entry一致。确认apiPrefixes覆盖该空间所有业务端点，客户端收藏或隐藏不能授予访问权限。

## 偏好与访问

目录GET同时返回全部可信空间和本人偏好。首次读取没有创建业务数据：已存在自学/健身默认加入，迁移不修改历史表。

收藏、加入、隐藏、位置使用版本号更新。全量排序在事务中校验所有可用空间id和预期版本，任一冲突整体回滚。最近访问不增加偏好修订号，以免浏览行为制造设置冲突；记录路径必须属于该空间，保留查询参数与锚点。首页、导航切换默认恢复lastPath，独立编辑页不记录或恢复，以免进入新的空草稿。

隐藏只从个人首页摘要和切换列表移除，已加入空间的今日任务仍会聚合。退出入口也保留业务数据，重新加入仍可读取历史记录。登录失效继续使用现有刷新恢复机制。

## 扩展验收配置

`src/spaces/testing.ts`与`modules/test-only.tsx`是明确标记的测试配置，只被测试引入，不注册进产品。2/6/12空间测试验证排序、隐藏、切换检索和通用首页；注册测试成长空间后无需改首页与导航。浏览器规模测试通过明确标记的目录夹具验证6/12空间布局、搜索和过滤，真实业务验证继续使用真实后端，二者分开记录。

考研与雅思仅是COMING_SOON目录项，本次不实现其业务模块。
