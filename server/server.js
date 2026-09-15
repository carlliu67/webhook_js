import Koa from 'koa';
import Router from 'koa-router';
import session from 'koa-session';
import serverConfig from './server_config.js';
import bodyParser from 'koa-bodyparser';
import { logger } from './util/logger.js';
import { handleVerification, handleEvent } from './wemeet/webhook.js';

// Start Server
const app = new Koa()
const router = new Router();

// 配置Session的中间件
app.keys = ['some secret hurr'];   /*cookie的签名*/
const koaSessionConfig = {
    key: 'lk_koa:session', /** 默认 */
    maxAge: 2 * 3600 * 1000,  /*  cookie的过期时间，单位 ms  */
    overwrite: true, /** (boolean) can overwrite or not (default true)  默认 */
    httpOnly: true, /**  true表示只有服务器端可以获取cookie */
    signed: true, /** 默认 签名 */
    rolling: true, /** 在每次请求时强行设置 cookie，这将重置 cookie 过期时间（默认：false） 【需要修改】 */
    renew: false, /** (boolean) renew session when session is nearly expired      【需要修改】*/
};
app.use(session(koaSessionConfig, app));
// 使用 koa-bodyparser 中间件
app.use(bodyParser());

// 健康检查，供容器 HEALTHCHECK / 负载均衡探活使用
router.get('/health', async (ctx) => {
    ctx.status = 200;
    ctx.body = { status: 'ok', uptime: Number(process.uptime().toFixed(3)) };
});

// webhook相关路由和处理
router.get(serverConfig.webhookPath, handleVerification);
router.post(serverConfig.webhookPath, handleEvent);

// 注册路由
const port = process.env.PORT || serverConfig.apiPort;
const host = process.env.HOST || '0.0.0.0';
app.use(router.routes()).use(router.allowedMethods());

const server = app.listen(port, host, () => {
    logger.info(`server is start, listening on ${host}:${port}`);
}).on('error', (err) => {
    logger.error(`Failed to start server on port ${port}:`, err);
});

// 容器场景下优雅退出（docker stop 会发送 SIGTERM）
function shutdown(signal) {
    logger.info(`received ${signal}, shutting down gracefully`);
    server.close(() => {
        logger.info('server closed');
        process.exit(0);
    });
    // 兜底：连接迟迟未释放时强制退出，避免容器停止被长时间阻塞
    setTimeout(() => process.exit(0), 8000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
