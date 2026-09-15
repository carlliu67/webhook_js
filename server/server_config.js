const config = {
    apiPort: process.env.PORT || "2306",   //后端指定端口
    wemmetWebhookToken: process.env.WEMEET_WEBHOOK_TOKEN || "",   //腾讯会议webhook回调token
    wemeetWebhookAESKey: process.env.WEMEET_WEBHOOK_AES_KEY || "",   //腾讯会议webhook回调AES密钥
    webhookPath: process.env.WEBHOOK_PATH || "/webhook", //webhook回调的api path
    logLevel: process.env.LOG_LEVEL || "info", // 日志级别，可选值：debug, info, warn, error
};

export default config;
