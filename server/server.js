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

// webhook相关路由和处理
router.get(serverConfig.webhookPath, handleVerification);
router.post(serverConfig.webhookPath, handleEvent);

// 注册路由
const port = process.env.PORT || serverConfig.apiPort;
app.use(router.routes()).use(router.allowedMethods());

app.listen(port, () => {
    logger.info(`server is start, listening on port ${port}`);
}).on('error', (err) => {
    logger.error(`Failed to start server on port ${port}:`, err);
});
