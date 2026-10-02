#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
if [[ $(id -u) == 0 ]]; then
    exec /usr/bin/sudo -n -H -u ubuntu /bin/bash "$0" "$@"
fi
[[ $(id -un) == ubuntu ]] || { echo '请使用 ubuntu 或 root 用户执行。'; exit 1; }
case "${1:-frontend}" in
    frontend) mode=publish ;;
    check) mode=check ;;
    *) echo '用法：deploy-frontend.sh frontend 或 deploy-frontend.sh check'; exit 2 ;;
esac
state=/opt/projects/xiajao/.deploy
mkdir -p "$state/releases" "$state/frontend-records"
# Shared with backend publishing: do not replace both containers at once.
exec 9>"$state/backend.lock"
flock -n 9 || { echo '已有前端或后端发布正在执行，请等待它完成。'; exit 1; }
export GIT_TERMINAL_PROMPT=0
repository=https://github.com/hero233-li/xiajiao-frontend.git
git_retry() {
    for attempt in 1 2 3; do
        if git -c http.version=HTTP/1.1 -c http.lowSpeedLimit=100 -c http.lowSpeedTime=30 "$@"; then return 0; fi
        if (( attempt < 3 )); then
            echo "GitHub 连接失败，5 秒后重试（$attempt/3）……"
            sleep 5
        fi
    done
    return 1
}
echo '正在读取前端 GitHub main 分支……'
if [[ ! -d "$state/frontend.git" ]]; then
    git_retry clone --bare "$repository" "$state/frontend.git"
fi
git_retry --git-dir="$state/frontend.git" fetch --prune origin '+refs/heads/main:refs/heads/main'
revision=$(git --git-dir="$state/frontend.git" rev-parse main)
echo "目标版本：$revision"
docker network inspect xiajiao-network >/dev/null
docker inspect xiajiao-frontend >/dev/null
mount_count=$(docker inspect xiajiao-frontend --format '{{len .Mounts}}')
[[ "$mount_count" == 0 ]] || { echo '前端新增了数据挂载，需先调整发布脚本。'; exit 1; }

verify_site() {
    python3 - "$1" <<'PY'
import json, sys, urllib.request
from html.parser import HTMLParser
base=sys.argv[1]
class Assets(HTMLParser):
    paths=[]
    def handle_starttag(self,tag,attributes):
        attrs=dict(attributes)
        for key in ('src','href'):
            value=attrs.get(key,'')
            if value.startswith('/assets/') and value.endswith(('.js','.css')):
                self.paths.append(value)
with urllib.request.urlopen(base+'/index.html',timeout=5) as response:
    html=response.read().decode()
parser=Assets()
parser.feed(html)
assert parser.paths,'No built frontend assets found'
for path in parser.paths:
    with urllib.request.urlopen(base+path,timeout=5) as response:
        assert response.status==200 and response.read(1)
with urllib.request.urlopen(base+'/api/v1/health',timeout=5) as response:
    result=json.load(response)
assert result['code']==0 and result['data']['status']=='UP'
PY
}
if [[ "$mode" == check ]]; then
    verify_site http://127.0.0.1:8080
    echo '仓库、页面资源及 API 转发检查通过；未发布。'
    exit 0
fi

stamp=$(date -u +%Y%m%dT%H%M%SZ)
release="$state/releases/frontend-$stamp-${revision:0:12}"
mkdir "$release"
git --git-dir="$state/frontend.git" archive "$revision" | tar -x -C "$release"
image="xiajiao-frontend:git-${revision:0:12}"
echo '正在构建前端镜像，现有网站继续运行……'
docker build --build-arg VITE_API_ORIGIN= -t "$image" "$release"

candidate="xiajiao-frontend-check-$stamp"
previous="xiajiao-frontend-prev-$stamp"
candidate_created=0
previous_renamed=0
new_created=0
completed=0
finish() {
    rc=$?
    trap - EXIT
    if (( candidate_created == 1 )); then docker rm -f "$candidate" >/dev/null 2>&1 || true; fi
    if (( completed == 0 && previous_renamed == 1 )); then
        echo '发布未完成，正在恢复旧前端容器……'
        if (( new_created == 1 )); then docker rm -f xiajiao-frontend >/dev/null 2>&1 || true; fi
        docker rename "$previous" xiajiao-frontend && docker start xiajiao-frontend >/dev/null && echo '旧前端容器已恢复。' || echo '恢复失败，请检查容器状态。'
    fi
    exit "$rc"
}
trap finish EXIT
trap 'exit 143' TERM
trap 'exit 130' INT
candidate_created=1
docker run -d --name "$candidate" --network xiajiao-network -p 127.0.0.1::80 \
    -e BACKEND_ORIGIN=http://backend:8080 "$image" >/dev/null
port=$(docker inspect "$candidate" --format '{{(index (index .NetworkSettings.Ports "80/tcp") 0).HostPort}}')
ready=0
for attempt in $(seq 1 30); do
    if verify_site "http://127.0.0.1:$port" 2>/dev/null; then ready=1; break; fi
    sleep 2
done
[[ "$ready" == 1 ]] || { echo '新前端页面或 API 转发检查失败，当前网站未更新。'; exit 1; }
docker rm -f "$candidate" >/dev/null
candidate_created=0

echo '新镜像检查通过，开始切换前端容器……'
docker stop --time=15 xiajiao-frontend >/dev/null
# Rename failure leaves the original container available to restart.
if ! docker rename xiajiao-frontend "$previous"; then
    docker start xiajiao-frontend >/dev/null || true
    exit 1
fi
previous_renamed=1
new_created=1
docker run -d --name xiajiao-frontend --restart always --network xiajiao-network \
    -p 8080:80 -e BACKEND_ORIGIN=http://backend:8080 \
    --log-opt max-size=10m --log-opt max-file=3 "$image" >/dev/null
ready=0
for attempt in $(seq 1 30); do
    if verify_site http://127.0.0.1:8080 2>/dev/null; then ready=1; break; fi
    sleep 2
done
[[ "$ready" == 1 ]] || { echo '切换后的检查未通过。'; exit 1; }
printf '%s\n' "$revision" > "$state/frontend-deployed-revision"
printf 'revision=%s\nprevious_container=%s\nimage=%s\n' "$revision" "$previous" "$image" > "$state/frontend-records/$stamp.txt"
completed=1
echo "前端发布成功：$revision"
echo "旧容器保留为：$previous"
echo '数据库、学习记录和附件未修改。'
