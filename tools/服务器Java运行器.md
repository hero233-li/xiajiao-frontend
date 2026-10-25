# 服务器上的 Java 运行器

线上的「实践演练 → 运行」不是在本机跑，而是丢给服务器上的这个服务编译并截图的。

## 依赖
- openjdk-17-jdk（必须带 Swing，不加 -headless 的包只有 JRE）
- xvfb、imagemagick（import + convert 截图与裁边）
- fonts-noto-cjk（中文字体，否则窗口里全是方框）

## 安装
```bash
sudo apt-get install -y openjdk-17-jdk xvfb imagemagick fonts-noto-cjk
sudo mkdir -p /opt/projects/xiajao/java-runner
sudo cp runner.py /opt/projects/xiajao/java-runner/
sudo cp xiajiao-java-runner.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now xiajiao-java-runner
```

## 访问路径
浏览器 → 前端容器 nginx（`/java-runner/` 反代，由 nginx 加 `X-Runner-Token`）→ 172.18.0.1:18791。
运行器只监听 Docker 网桥地址，公网进不来；令牌只存在镜像环境变量里，前端代码拿不到。

## 已知限制
程序如果有 `JOptionPane.showInputDialog`、按钮等交互，远程点不了，截图会停在第一个输入框。
要跑完整流程就在本机用 `tools/run-java.sh`。
