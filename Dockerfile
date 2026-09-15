# 基础镜像，可替换为大陆可访问的镜像站，例如：
#   docker.m.daocloud.io/node:20-alpine
#   swr.cn-north-4.myhuaweicloud.com/ddn-k8s/docker.io/node:20-alpine
ARG BASE_IMAGE=node:20-alpine
FROM ${BASE_IMAGE}

LABEL org.opencontainers.image.title="webhook-js" \
      org.opencontainers.image.description="腾讯会议 Webhook 回调服务"

# 构建期镜像源（apk / npm），均可通过 --build-arg 或 docker-compose 覆盖
ARG APK_MIRROR=https://mirrors.aliyun.com
ARG NPM_REGISTRY=https://registry.npmmirror.com

# 默认配置，均可通过 docker run -e / docker-compose environment 覆盖
ENV NODE_ENV=production \
    PORT=2306 \
    HOST=0.0.0.0 \
    TZ=Asia/Shanghai

# 使用大陆 apk 源，并让 TZ 生效（alpine 基础镜像默认不带 tzdata）
RUN sed -i "s|https\?://dl-cdn.alpinelinux.org|${APK_MIRROR}|g" /etc/apk/repositories \
    && apk add --no-cache tzdata

WORKDIR /app

# 先只复制依赖清单，最大化利用 Docker 构建缓存
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund --registry=${NPM_REGISTRY} \
    && npm cache clean --force

COPY server ./server

# 日志目录（winston-daily-rotate-file 输出到 ./logs），需可被 node 用户写入
RUN mkdir -p /app/logs && chown -R node:node /app

# 以非 root 用户运行
USER node

EXPOSE 2306

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1 || exit 1

CMD ["node", "./server/server.js"]
