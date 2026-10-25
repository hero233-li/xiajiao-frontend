#!/usr/bin/env python3
"""xiajiao Java 运行器（服务器版）

只监听 Docker 网桥地址，由前端容器的 Nginx 反代 /java-runner/ 进来，
请求必须带 X-Runner-Token，令牌只存在于镜像与服务端，浏览器拿不到。

POST /run   {"code": "..."}  -> 编译 + 在 Xvfb 里跑，回 stdout 与窗口截图
POST /stop                   -> 结束残留进程
GET  /health
"""

import base64
import json
import os
import re
import shutil
import signal
import socket
import subprocess
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HOST = os.environ.get("RUNNER_HOST", "172.18.0.1")
PORT = int(os.environ.get("RUNNER_PORT", "18791"))
TOKEN = os.environ.get("RUNNER_TOKEN", "")
TOKEN_FILE = "/opt/projects/xiajao/java-runner/token"
MAX_CODE = 200_000
COMPILE_TIMEOUT = 30
RUN_WAIT = 3.0
MAX_CONCURRENT = 1

LOCK = threading.Semaphore(MAX_CONCURRENT)
LIVE = []  # [(pgid, display)]


def read_token():
    if TOKEN:
        return TOKEN
    try:
        with open(TOKEN_FILE, "r", encoding="utf-8") as handle:
            return handle.read().strip()
    except OSError:
        return ""


def class_name(code):
    match = re.search(r"public\s+(?:final\s+)?class\s+([A-Za-z_$][\w$]*)", code)
    if match:
        return match.group(1)
    match = re.search(r"class\s+([A-Za-z_$][\w$]*)", code)
    return match.group(1) if match else None


def free_display():
    for number in range(99, 160):
        if not os.path.exists(f"/tmp/.X11-unix/X{number}"):
            return number
    raise RuntimeError("没有空闲的 X display")


def capture(display):
    """截当前 display 的根窗口，并把四周纯黑边裁掉。"""
    try:
        raw = subprocess.run(
            ["import", "-display", f":{display}", "-window", "root", "-silent", "png:-"],
            capture_output=True, timeout=15, check=True,
        ).stdout
        print(f"capture raw={len(raw)}", flush=True)
        if not raw:
            return None
        trimmed = subprocess.run(
            ["convert", "png:-", "-trim", "+repage", "png:-"],
            input=raw, capture_output=True, timeout=15,
        )
        print(f"trim rc={trimmed.returncode} out={len(trimmed.stdout)} err={trimmed.stderr[:200]!r}", flush=True)
        data = trimmed.stdout if trimmed.returncode == 0 and trimmed.stdout else raw
        # 全黑画面（程序没有窗口）就别回一张空图
        probe = subprocess.run(
            ["convert", "png:-", "-format", "%[fx:mean]", "info:"],
            input=data, capture_output=True, timeout=10,
        )
        if probe.returncode == 0:
            try:
                mean = float(probe.stdout.decode().strip())
                print(f"mean={mean:.3f}", flush=True)
                if mean < 0.02:
                    return None
            except (ValueError, UnicodeDecodeError):
                pass
        return "data:image/png;base64," + base64.b64encode(data).decode()
    except Exception as error:  # noqa: BLE001
        print(f"capture failed: {error!r}", flush=True)
        return None


def run_code(code):
    name = class_name(code)
    if not name:
        return 400, {"ok": False, "stage": "compile", "message": "没找到 class 定义，代码可能不完整。"}

    work = tempfile.mkdtemp(prefix="xj-java-")
    source = os.path.join(work, f"{name}.java")
    with open(source, "w", encoding="utf-8") as handle:
        handle.write(code)

    compile_result = subprocess.run(
        ["javac", "-encoding", "UTF-8", "-d", work, source],
        capture_output=True, text=True, timeout=COMPILE_TIMEOUT, cwd=work,
    )
    if compile_result.returncode != 0:
        shutil.rmtree(work, ignore_errors=True)
        output = (compile_result.stdout + compile_result.stderr).strip()
        return 200, {"ok": False, "stage": "compile", "className": name, "output": output[-4000:]}

    display = free_display()
    xvfb = subprocess.Popen(
        ["Xvfb", f":{display}", "-screen", "0", "1280x800x24", "-nolisten", "tcp"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True,
    )
    env = dict(os.environ)
    env.update({"DISPLAY": f":{display}", "HOME": work, "LANG": "zh_CN.UTF-8", "LC_ALL": "zh_CN.UTF-8"})
    child = None
    try:
        time.sleep(0.8)
        child = subprocess.Popen(
            ["java", "-Dfile.encoding=UTF-8", "-Dawt.useSystemAAFontSettings=on", "-Dsun.java2d.uiScale=1", name],
            cwd=work, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            text=True, start_new_session=True,
        )
        LIVE.append((child.pid, display))
        deadline = time.time() + RUN_WAIT
        exited = None
        while time.time() < deadline:
            exited = child.poll()
            if exited is not None:
                break
            time.sleep(0.2)

        image = None
        if exited is None:
            time.sleep(0.4)
            image = capture(display)
        output = ""
        try:
            child.kill()
            output = (child.communicate(timeout=5)[0] or "").strip()
        except Exception:
            pass
        return 200, {
            "ok": True,
            "className": name,
            "output": output[-4000:],
            "image": image,
            "windowed": exited is None,
            "exitCode": exited,
        }
    finally:
        if child is not None:
            try:
                os.killpg(os.getpgid(child.pid), signal.SIGKILL)
            except Exception:
                pass
            LIVE[:] = [item for item in LIVE if item[0] != child.pid]
            try:
                child.wait(timeout=5)  # 收尸，免得留僵尸进程
            except Exception:
                pass
        try:
            os.killpg(os.getpgid(xvfb.pid), signal.SIGKILL)
        except Exception:
            pass
        try:
            xvfb.wait(timeout=5)
        except Exception:
            pass
        shutil.rmtree(work, ignore_errors=True)


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        print(f"{time.strftime('%Y-%m-%dT%H:%M:%S')} {self.address_string()} {fmt % args}", flush=True)

    def send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    @staticmethod
    def route(path):
        """Nginx 用变量 proxy_pass 时不会去掉 /java-runner 前缀，这里自己剥。"""
        path = path.rstrip("/") or "/"
        if path.startswith("/java-runner"):
            path = path[len("/java-runner"):] or "/"
        return path

    def authorized(self):
        expected = read_token()
        return bool(expected) and self.headers.get("X-Runner-Token") == expected

    def do_GET(self):
        if self.route(self.path) == "/health":
            return self.send_json(200, {"ok": True, "busy": LOCK._value == 0})
        self.send_json(404, {"ok": False, "message": "not found"})

    def do_POST(self):
        if not self.authorized():
            return self.send_json(403, {"ok": False, "message": "forbidden"})
        path = self.route(self.path)
        length = int(self.headers.get("Content-Length") or 0)
        if length > MAX_CODE:
            return self.send_json(413, {"ok": False, "message": "代码太长了"})

        if path == "/stop":
            for pid, display in list(LIVE):
                try:
                    os.killpg(os.getpgid(pid), signal.SIGKILL)
                except Exception:
                    pass
                try:
                    subprocess.run(["pkill", "-f", f"Xvfb :{display}"], timeout=5)
                except Exception:
                    pass
            LIVE.clear()
            return self.send_json(200, {"ok": True})

        if path != "/run":
            return self.send_json(404, {"ok": False, "message": "not found"})

        try:
            payload = json.loads(self.rfile.read(length) or b"{}")
        except Exception:
            return self.send_json(400, {"ok": False, "message": "请求体不是合法 JSON"})
        code = (payload.get("code") or "").strip()
        if not code:
            return self.send_json(400, {"ok": False, "stage": "compile", "message": "代码是空的"})

        if not LOCK.acquire(blocking=False):
            return self.send_json(429, {"ok": False, "message": "上一次还在跑，等几秒再试。"})
        try:
            status, result = run_code(code)
            self.send_json(status, result)
        except subprocess.TimeoutExpired:
            self.send_json(200, {"ok": False, "stage": "compile", "message": "编译超时了（超过 30 秒）。"})
        except Exception as error:  # noqa: BLE001
            self.send_json(500, {"ok": False, "message": f"运行器出错：{error}"})
        finally:
            LOCK.release()


if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"java-runner listening on {HOST}:{PORT}", flush=True)
    server.serve_forever()
