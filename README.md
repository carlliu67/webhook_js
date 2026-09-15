## 安装依赖
`npm install`

## 启动运行
`npm run start`

## Docker 部署

### 1. 准备配置
```bash
cp .env.example .env
```
按需填写 `.env`：

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `PORT` | 容器内监听端口 | `2306` |
| `HOST` | 监听地址，容器内保持 `0.0.0.0` | `0.0.0.0` |
| `WEMEET_WEBHOOK_TOKEN` | 腾讯会议 Webhook Token | 空 |
| `WEMEET_WEBHOOK_AES_KEY` | 腾讯会议 Webhook EncodingAESKey | 空 |
| `WEBHOOK_PATH` | 回调路径 | `/webhook` |
| `LOG_LEVEL` | 日志级别 `debug/info/warn/error` | `info` |
| `HOST_PORT` | 宿主机映射端口（仅 docker-compose 使用） | `2306` |

### 2. 构建并启动
```bash
# 方式一：docker compose（推荐）
docker compose up -d --build

# 方式二：docker run
docker build -t webhook-js:latest .
docker run -d --name webhook-js --restart unless-stopped \
  --env-file .env \
  -p 2306:2306 \
  -v webhook-logs:/app/logs \
  webhook-js:latest
```

### 3. 常用命令
```bash
docker compose logs -f        # 查看日志
docker compose ps             # 查看状态与健康检查结果
docker compose restart        # 应用新配置后重启
docker compose down           # 停止并移除容器
```

也可使用 npm 脚本：`npm run docker:build` / `npm run docker:up` / `npm run docker:down` / `npm run docker:logs`。

### 镜像源配置（大陆环境）

构建期已默认使用大陆源，可通过 `.env`（compose）或 `--build-arg`（docker build）覆盖：

| 构建参数 | 说明 | 默认值 |
| --- | --- | --- |
| `BASE_IMAGE` | 基础镜像 | `node:20-alpine` |
| `APK_MIRROR` | alpine apk 源 | `https://mirrors.aliyun.com` |
| `NPM_REGISTRY` | npm 源 | `https://registry.npmmirror.com` |

```bash
# docker build 方式覆盖
docker build -t webhook-js:latest \
  --build-arg BASE_IMAGE=docker.m.daocloud.io/node:20-alpine \
  --build-arg APK_MIRROR=https://mirrors.ustc.edu.cn \
  --build-arg NPM_REGISTRY=https://registry.npmmirror.com .
```

可选值参考：

- `BASE_IMAGE`：`node:20-alpine`、`docker.m.daocloud.io/node:20-alpine`、`swr.cn-north-4.myhuaweicloud.com/ddn-k8s/docker.io/node:20-alpine`
- `APK_MIRROR`：`https://mirrors.aliyun.com`（阿里云）、`https://mirrors.ustc.edu.cn`（中科大）、`https://mirrors.tencent.com`（腾讯）
- `NPM_REGISTRY`：`https://registry.npmmirror.com`、`https://mirrors.tencent.com/npm/`、`https://mirrors.ustc.edu.cn/npm/`

若宿主机连 `docker.io` 也不通，需为 Docker 守护进程配置 registry 镜像（改 `/etc/docker/daemon.json` 后 `systemctl restart docker`）：

```json
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://mirrors.ustc.edu.cn"
  ]
}
```

### 说明
- 服务提供 `GET /health` 探活接口，容器已配置 `HEALTHCHECK`。
- 运行日志同时输出到 stdout（可用 `docker logs` 查看）和容器内 `/app/logs`（默认挂载命名卷 `webhook-logs`）。
  如需落到宿主机，将 `docker-compose.yml` 中的挂载改为 `- ./logs:/app/logs`，并执行 `mkdir -p logs && sudo chown 1000:1000 logs`（容器内以 uid 1000 运行）。
- 密钥仅通过环境变量注入，不写入镜像。
