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
    cleanup) mode=cleanup ;;
    *) echo '用法：deploy-frontend.sh frontend / check / cleanup'; exit 2 ;;
esac
state=/opt/projects/xiajao/.deploy
mkdir -p "$state/releases" "$state/frontend-records"
# Shared with backend publishing: do not replace both containers at once.
exec 9>"$state/backend.lock"
flock -n 9 || { echo '已有前端或后端发布正在执行，请等待它完成。'; exit 1; }
cleanup_previous() {
    python3 - <<'PY'
import json, re, subprocess
def docker(*args):
    return subprocess.check_output(['docker', *args], text=True)
names=docker('ps', '-a', '--format', '{{.Names}}').splitlines()
previous=[]
for name in names:
    if not re.fullmatch(r'xiajiao-frontend-prev-\d{8}T\d{6}Z', name):
        continue
    info=json.loads(docker('inspect', name))[0]
    # Only disposable, stopped frontend containers; never remove volumes.
    if info['State']['Status'] not in ('exited', 'created') or info['Mounts']:
        print('跳过运行中或带数据挂载的容器：'+name)
        continue
    previous.append(name)
previous.sort(reverse=True)
for name in previous:
    subprocess.run(['docker', 'update', '--restart=no', name], check=True, stdout=subprocess.DEVNULL)
for name in previous[1:]:
    subprocess.run(['docker', 'rm', name], check=True, stdout=subprocess.DEVNULL)
    print('已清理旧前端容器：'+name)
if previous:
    print('保留最近一个回退容器：'+previous[0])
else:
    print('没有需要清理的旧前端容器。')
PY
}
if [[ "$mode" == cleanup ]]; then
    cleanup_previous
    exit 0
fi
echo '正在通过 GitHub API 读取前端 main 最新版本……'
curl --fail --silent --show-error --connect-timeout 10 --max-time 30 \
    --retry 2 --retry-delay 3 --retry-max-time 100 \
    -H 'Accept: application/vnd.github+json' \
    https://api.github.com/repos/hero233-li/xiajiao-frontend/commits/main > "$state/frontend-main.json"
revision=$(python3 - "$state/frontend-main.json" <<'PY'
import json,re,sys
sha=json.load(open(sys.argv[1])).get('sha','')
if not re.fullmatch('[0-9a-f]{40}',sha):
    sys.exit('无法读取最新提交版本，发布已停止。')
print(sha)
PY
)
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
echo '正在下载 GitHub 官方源码包，现有网站继续运行……'
curl --location --fail --silent --show-error --connect-timeout 10 --max-time 180 \
    --retry 2 --retry-delay 3 --retry-max-time 560 \
    "https://codeload.github.com/hero233-li/xiajiao-frontend/tar.gz/$revision" \
    -o "$release/.source.tar.gz"
tar -xzf "$release/.source.tar.gz" --strip-components=1 -C "$release"
rm -f -- "$release/.source.tar.gz"
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
        docker rename "$previous" xiajiao-frontend && docker update --restart=always xiajiao-frontend >/dev/null && docker start xiajiao-frontend >/dev/null && echo '旧前端容器已恢复。' || echo '恢复失败，请检查容器状态。'
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
docker update --restart=no "$previous" >/dev/null
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
if ! cleanup_previous; then
    echo '前端已发布成功，但旧容器清理失败，可稍后执行 cleanup 重试。'
fi
echo "前端发布成功：$revision"
echo "旧容器保留为：$previous"
echo '数据库、学习记录和附件未修改。'
