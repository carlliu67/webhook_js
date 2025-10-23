import crypto from 'crypto';
import querystring from 'querystring';
import { Buffer } from 'buffer';
import serverConfig from '../server_config.js';
import { logger } from '../util/logger.js';

/**
 * 验证签名
 * @param {string} timestamp 时间戳
 * @param {string} nonce 随机数
 * @param {string} checkStr 校验字符串
 * @param {string} signature 签名
 * @returns {boolean} 是否验证通过
 */
function verifySignature(timestamp, nonce, data, signature) {
    // 1. 将token、timestamp、nonce、data按字典序排序
    const arr = [serverConfig.wemmetWebhookToken, timestamp, nonce, data].sort();

    // 2. 将排序后的字符串拼接成一个字符串
    const str = arr.join('');
    // logger.info('str:', str);

    // 3. 使用sha1算法加密
    const sha1 = crypto.createHash('sha1');
    sha1.update(str);
    const computedSignature = sha1.digest('hex');
    // logger.info('computedSignature:', computedSignature);

    // 4. 比较计算出的签名与传入的签名
    return computedSignature === signature;
}

/**
 * 使用 EncodingAESKey 的解密函数
 * @param {string} base64EncodedData - Base64编码的加密数据
 * @returns {string|null} 解密后的明文或null（失败时）
 */
function decryptAES(base64EncodedData) {
    try {
        // 1. 参数校验
        if (!base64EncodedData) {
            throw new Error('参数不能为空');
        }

        // 2. 处理EncodingAESKey：补上等号后Base64解码
        const aesKeyBase64 = serverConfig.wemeetWebhookAESKey + '=';
        const aesKey = Buffer.from(aesKeyBase64, 'base64');

        if (aesKey.length !== 32) {
            throw new Error('Base64解码后的AES密钥应为32字节');
        }

        // 3. Base64解码加密数据
        const encryptedData = Buffer.from(base64EncodedData, 'base64');

        // 4. 准备AES解密参数
        const algorithm = 'aes-256-cbc'; // 使用CBC模式
        const iv = aesKey.slice(0, 16); // 取密钥前16字节作为IV

        // 5. 创建解密器
        const decipher = crypto.createDecipheriv(algorithm, aesKey, iv);

        // 6. 执行解密
        let decrypted = decipher.update(encryptedData);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        // 7. 返回解密结果
        return decrypted.toString('utf8');
    } catch (error) {
        logger.error('解密失败:', error.message);
        return null;
    }
}

/**
 * 处理GET验证请求
 */
async function handleVerification(ctx) {
    try {
        const { check_str: checkStr } = ctx.query;
        const { timestamp, nonce, signature } = ctx.headers;
        var result = '';

        if (!timestamp || !nonce || !signature) {
            ctx.throw(400, 'Missing required headers');
            logger.error('Missing required headers');
            return;
        }

        // 验证签名
        const isValid = verifySignature(timestamp, nonce, checkStr, signature);
        if (!isValid) {
            ctx.throw(403, 'Invalid signature');
            logger.error('Invalid signature');
            return;
        }

        // URL解码
        var decodedCheckStr = checkStr ? querystring.unescape(checkStr) : '';

        if (serverConfig.wemeetWebhookAESKey.length > 1) {
            // 解密check_str
            result = decryptAES(decodedCheckStr);
        } else {
            // base64解码
            result = Buffer.from(decodedCheckStr, 'base64').toString('utf8');
        }

        // 返回解密后的字符串（注意：不能加引号或换行符）
        ctx.status = 200;
        ctx.body = result;
    } catch (error) {
        ctx.throw(500, `Verification failed: ${error.message}`);
    }
}

/**
 * 处理会议创建消息
 */
async function webhookCreateMeeting(eventData) {
    const webhookMeetingInfo = eventData.payload[0].meeting_info;
    if (!webhookMeetingInfo) {
        logger.error("未获取到会议信息");
        return;
    }

}



/**
 * 处理POST事件回调
 */
async function handleEvent(ctx) {
    try {
        const { data } = ctx.request.body;
        const { timestamp, nonce, signature } = ctx.headers;
        var result = '';

        if (!timestamp || !nonce || !signature) {
            ctx.throw(400, 'Missing required headers');
            logger.error('Missing required headers');
            return;
        }

        // 验证签名
        const isValid = verifySignature(timestamp, nonce, data, signature);
        if (!isValid) {
            ctx.throw(403, 'Invalid signature');
            logger.error('Invalid signature');
            return;
        }

        // 解密check_str
        if (serverConfig.wemeetWebhookAESKey.length > 1) {
            result = decryptAES(data);
            // console.log('解密后的字符串:', decryptedStr);
        } else {
            // base64解码
            result = Buffer.from(data, 'base64').toString('utf8');
        }

        // 解析JSON数据
        const eventData = JSON.parse(result);

        // 返回成功响应
        ctx.status = 200;
        ctx.body = 'successfully received callback';

        // 处理事件
        switch (eventData.event) {
            // 会议创建事件
            case 'meeting.created':
                logger.info('会议创建:', eventData);
                webhookCreateMeeting(eventData);
                break;
            default:
                logger.info('收到未知事件:', eventData);
        }
    } catch (error) {
        ctx.throw(500, `Event processing failed: ${error.message}`);
    }
}

export {
    handleVerification,
    handleEvent
};