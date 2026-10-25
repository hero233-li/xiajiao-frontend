# 在 frontend-v2 目录执行：docker build -t xiajiao-frontend .
FROM node:22-alpine AS build
WORKDIR /app

# 先复制锁文件，源码变化时复用依赖层。
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Vite 环境变量在构建时写入浏览器代码；这里不能存放密钥。
# 留空表示同源请求，由 Nginx 转发 /api/。
ARG VITE_API_ORIGIN=""
ENV VITE_API_ORIGIN=${VITE_API_ORIGIN}
RUN npm run build

FROM nginx@sha256:0985e772fb9f729e6fa0980da05fca5d9c468e870eed43071545afa9d2e27d94 AS runtime
# Distrust the compromised eMudhra root and its legacy cross-signing root.
RUN sed -i '/emSign_ECC_Root_CA_-_G3\.crt/d; /AAA_Certificate_Services\.crt/d' /etc/ca-certificates.conf \
    && rm -f /usr/share/ca-certificates/mozilla/emSign_ECC_Root_CA_-_G3.crt \
             /usr/share/ca-certificates/mozilla/AAA_Certificate_Services.crt \
    && update-ca-certificates --fresh
# backend 为同一 Docker 网络中的后端服务名，可在启动时覆盖。
ENV BACKEND_ORIGIN=http://backend:8080 \
    NGINX_ENVSUBST_FILTER='^BACKEND_ORIGIN$' 
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
# 构建机 umask 可能把 public/ 里的静态文件带成 600，nginx worker 读不了会 403。
RUN chmod -R a+rX /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1/index.html || exit 1
CMD ["nginx", "-g", "daemon off;"]
