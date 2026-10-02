# 在 frontend 目录执行：docker build -t xiajiao-frontend .
FROM node:22-alpine AS build
WORKDIR /app

# 先复制锁文件，源码变化时复用依赖层。
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Vite 环境变量在构建时写入浏览器代码；这里不能存放密钥。
# 留空表示同源请求，由 Nginx 转发 /api/。
ARG VITE_API_ORIGIN=""
ENV VITE_API_ORIGIN=${VITE_API_ORIGIN} \
    VITE_API_MOCK=false
RUN npm run build && rm -f dist/mockServiceWorker.js

FROM nginx:stable-alpine AS runtime
# backend 为同一 Docker 网络中的后端服务名，可在启动时覆盖。
ENV BACKEND_ORIGIN=http://backend:8080 \
    NGINX_ENVSUBST_FILTER=^BACKEND_ORIGIN$
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1/index.html || exit 1
CMD ["nginx", "-g", "daemon off;"]
