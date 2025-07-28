// src/utils/crypto.ts
import CryptoJS from 'crypto-js';
import JSEncrypt from 'jsencrypt';
import axios from 'axios';


// 获取会话公钥
export async function fetchSessionKey() {
    const response = await axios.get('${process.env.VUE_APP_API_BASE_URL}/auth/session-key'); // 调用公钥获取api
    return response.data.publicKey; // 返回公钥
}

// PBKDF2 哈希加密
export function encryptPassword(password: string, salt: string) {
    const iterations = 10000; // 哈希加密的迭代次数
    const keySize = 512 / 32; // 生成的密钥的大小

    return CryptoJS.PBKDF2('${salt}${password}', salt, {
        keySize,
        iterations
    }).toString();
}

// RSA（非对称加密） 加密敏感数据
export async function encryptWithSessionKey(data: string, publicKey: string) {
    const encrypt = new JSEncrypt(); // 创建加密实例
    encrypt.setPublicKey(publicKey); // 设置加密公钥
    return encrypt.encrypt(data); // 对数据进行加密并返回
}

// 完整登录凭证加密流程
export async function generateSecureCredentials(
    account: string,
    password: string
) {
    // 1.获取会话公钥
    const publicKey = await fetchSessionKey();

    // 2.生成随机盐值(16位)
    const salt = CryptoJS.lib.WordArray.random(128 / 8).toString();

    // 3.加密密码
    const encryptedPassword = encryptPassword(password, salt);

    // 4.加密账户信息
    const encryptedAccount = await encryptWithSessionKey(account, publicKey);

    return {
        salt,
        encryptedAccount,
        encryptedPassword
    };
}