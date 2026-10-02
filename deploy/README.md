# 前端一键发布

服务器脚本：`/opt/projects/xiajao/deploy-frontend.sh`。拉取 GitHub 前端仓库 `main` 分支并在 Docker 内构建，不需要在宿主机安装 Node.js。先在本地提交并推送代码。

1Panel 创建“发布前端”Shell 任务，用户 `ubuntu`（也支持 `root`），解释器 `bash`，不勾选“在容器中执行”，脚本内容：

```sh
/bin/bash /opt/projects/xiajao/deploy-frontend.sh frontend
```

保留执行日志 7 份，超时 3600 秒，失败重试 0 次。执行周期可先设每月 1 日 00:00；保存后立即停用定时任务，按需点击“立即执行”。发布不会修改数据库和附件。

也可在 Mac 执行：

```sh
ssh learning '/bin/bash /opt/projects/xiajao/deploy-frontend.sh frontend'
```

发布与后端共用互斥锁；有任务正在执行时拒绝重复启动。先构建新镜像，在仅绑定服务器本机的临时端口检查首页、JS/CSS 和后端 API 转发，检查通过后切换公网 8080 的前端容器。切换失败则恢复旧容器。成功后旧容器保持停止并保留，记录位于 `/opt/projects/xiajao/.deploy/frontend-records/`。旧容器、镜像和发布源码目录不会自动删除，应定期检查磁盘并按需清理。

脚本只发布 GitHub 上已推送的代码，未提交或未推送的本地修改不包含在发布中。网站入口仍为 `http://124.222.151.76:8080`，后端通过 `xiajiao-network` 内的 `backend:8080` 访问。
