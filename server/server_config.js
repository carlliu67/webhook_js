const config = {
    apiPort: "2306",   //后端指定端口
    wemmetWebhookToken: "",   //腾讯会议webhook回调token
    wemeetWebhookAESKey: "",   //腾讯会议webhook回调AES密钥
    webhookPath:  "/webhook", //webhook回调的api path
    logLevel: "info", // 日志级别，可选值：debug, info, warn, error
};

export default config;