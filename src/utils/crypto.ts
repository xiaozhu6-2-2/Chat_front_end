// src/utils/crypto.ts
// 原始账号密码都通过获取的公钥加密 → 后端通过私钥解密获取原始账号密码 → 数据库比对 → 返回token
import JSEncrypt from 'jsencrypt'
import axios from 'axios'

export async function fetchSessionKey() {
    // 获取公钥
    const response = await axios.get(`${process.env.VUE_APP_API_BASE_URL}/auth/session-key`);
    return response.data.public_key;
}

// 生成完整登录凭证
export async function generateSecureCredentials(
    account : string,
    password : string
) {
    // 获取公钥
    const publicKey = await fetchSessionKey();

    // 创建实例并设置公钥
    const encrypt = new JSEncrypt();
    encrypt.setPublicKey(publicKey);

    // 加密账号、密码
    const encryptedAccount = encrypt.encrypt(account);
    const encryptedPassword = encrypt.encrypt(password);

    return {
        account: encryptedAccount,
        password: encryptedPassword
    }
}