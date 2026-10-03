# 前端一键发布

服务器脚本：`/opt/projects/xiajao/deploy-frontend.sh`。拉取 GitHub 前端仓库 `main` 分支并在 Docker 内构建，不需要在宿主机安装 Node.js。先在本地提交并推送代码。

为了避开服务器上的 Git HTTPS 连接中断，脚本通过 GitHub 官方 API 查询最新提交及文件清单，按 Git 文件哈希复用上次成功发布的源码，只从官方 raw 服务下载新增或修改的文件，不再每次下载完整源码包。删除或重命名的旧路径不会进入新版本；每个文件都会校验 Git 哈希。当前适用于公开仓库，不支持符号链接或子模块。首次没有源码缓存时需要下载所有文件。

1Panel 创建“发布前端”Shell 任务，用户 `ubuntu`（也支持 `root`），解释器 `bash`，不勾选“在容器中执行”，脚本内容：

```sh
/bin/bash /opt/projects/xiajao/deploy-frontend.sh frontend
```

保留执行日志 7 份，超时 3600 秒，失败重试 0 次。执行周期可先设每月 1 日 00:00；保存后立即停用定时任务，按需点击“立即执行”。发布不会修改数据库和附件。

文件清单单次最多等待 60 秒；变更文件并行下载（最多 4 个），单文件最多等待 300 秒并重试一次。同步和校验完成后才开始构建和切换容器。若已发布提交号与 GitHub 最新提交一致，检查网站后直接结束，不下载、不构建、不重启。请保持任务总超时为 3600 秒。

也可在 Mac 执行：

```sh
ssh learning '/bin/bash /opt/projects/xiajao/deploy-frontend.sh frontend'
```

发布与后端共用互斥锁；有任务正在执行时拒绝重复启动。先构建新镜像，在仅绑定服务器本机的临时端口检查首页、JS/CSS 和后端 API 转发，检查通过后切换公网 8080 的前端容器。切换失败则恢复旧容器。成功后只保留最近一个已停止的回退容器，并关闭它的自动重启；更早的旧前端容器会自动删除。清理会跳过运行中或带数据挂载的容器，不删除数据卷。记录位于 `/opt/projects/xiajao/.deploy/frontend-records/`。镜像和发布源码目录仍保留，应定期检查磁盘并按需清理。

清理已积累的旧前端容器（不发布、不访问 GitHub）：

```bash
ssh learning '/bin/bash /opt/projects/xiajao/deploy-frontend.sh cleanup'
```

脚本只发布 GitHub 上已推送的代码，未提交或未推送的本地修改不包含在发布中。网站入口仍为 `http://124.222.151.76:8080`，后端通过 `xiajiao-network` 内的 `backend:8080` 访问。
