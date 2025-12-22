/**
 * 认证服务层
 *
 * 职责：
 * - 处理所有认证相关的 API 调用
 * - 实现登录、注册、Token 验证、登出等核心业务逻辑
 * - 统一的错误处理和日志记录
 * - 不处理 UI 反馈（如 snackbar）
 * - 不处理服务初始化（这部分保留在 useAuth 中）
 */

import type {
  EncryptedRegisterParams,
  LoginCredentials,
  LoginResponse,
  RegisterData,
  RegisterResponse,
  TokenValidationResponse,
} from '@/types/auth'
import axios from 'axios'
import { authApi, noauthApi } from './api'
import { generateSecureCredentials } from './crypto'

/**
 * 认证服务
 *
 * 提供所有认证相关的 API 调用方法
 */
export const authService = {
  /**
   * 用户登录
   *
   * 执行流程：
   * 1. 加密用户凭据
   * 2. 调用登录 API
   * 3. 验证响应数据
   * 4. 返回标准化的响应格式
   *
   * @param {LoginCredentials} credentials - 登录凭据
   * @returns {Promise<LoginResponse>} 登录响应
   */
  async login (credentials: LoginCredentials): Promise<LoginResponse> {
    console.log('authService: 开始登录流程')

    try {
      // 使用 RSA 加密用户凭据
      const { encryptedAccount, encryptedPassword } = await generateSecureCredentials(
        credentials.account,
        credentials.password,
      )

      if (!encryptedAccount || !encryptedPassword) {
        throw new Error('加密失败')
      }

      console.log('authService: 凭据加密完成，调用登录 API')

      // 调用登录 API
      const response = await noauthApi.post('/auth/login', {
        account: encryptedAccount,
        password: encryptedPassword,
        rememberMe: true,
      })

      console.log('authService: 登录 API 响应', response.data)

      // 验证响应数据
      // API 直接返回用户数据，没有包装在 success/data 中
      if (response.data && response.data.token) {
        return {
          success: true,
          data: {
            token: response.data.token,
            userId: response.data.uid || response.data.userId, // API 返回的是 uid
            username: response.data.username,
          },
        }
      } else {
        return {
          success: false,
          message: response.data?.message || '登录失败',
          code: response.data?.code,
        }
      }
    } catch (error: any) {
      console.error('authService: 登录失败', error)

      // 返回标准化的错误响应
      return {
        success: false,
        message: error.response?.data?.message || error.message || '登录请求失败',
        code: error.response?.status,
      }
    }
  },

  /**
   * 用户注册
   *
   * 执行流程：
   * 1. 加密账户和密码
   * 2. 准备注册数据
   * 3. 调用注册 API
   * 4. 返回注册结果
   *
   * @param {RegisterData} userData - 注册数据
   * @returns {Promise<RegisterResponse>} 注册响应
   */
  async register (userData: RegisterData): Promise<RegisterResponse> {
    console.log('authService: 开始注册流程')

    try {
      // 使用 RSA 加密账户和密码
      const { encryptedAccount, encryptedPassword } = await generateSecureCredentials(
        userData.account,
        userData.password,
      )

      if (!encryptedAccount || !encryptedPassword) {
        throw new Error('加密失败')
      }

      console.log('authService: 凭据加密完成，调用注册 API')

      // 准备请求数据，使用类型定义中的函数
      const requestData: EncryptedRegisterParams = {
        account: encryptedAccount,
        password: encryptedPassword,
        username: userData.username,
        gender: userData.gender ?? null,
        region: userData.region ?? null,
        bio: userData.bio ?? null,
        avatar: userData.avatar ?? '1',
      }

      // 调用注册 API
      const response = await noauthApi.post('/auth/register', requestData)

      console.log('authService: 注册 API 响应', response.data)

      // 返回注册结果
      return response.data && response.data.success
        ? {
            success: true,
            message: response.data.message || '注册成功',
            token: response.data.token,  // 提取注册后返回的临时token
          }
        : {
            success: false,
            message: response.data?.message || '注册失败',
            code: response.data?.code,
          }
    } catch (error: any) {
      console.error('authService: 注册失败', error)

      return {
        success: false,
        message: error.response?.data?.message || error.message || '注册请求失败',
        code: error.response?.status,
      }
    }
  },

  /**
   * 验证 Token
   *
   * 执行流程：
   * 1. 创建临时的 API 实例，避免循环依赖
   * 2. 直接在请求头中传入 Token
   * 3. 检查 Token 有效性
   * 4. 返回验证结果
   *
   * @param {string} token - 要验证的 Token
   * @returns {Promise<TokenValidationResponse>} 验证响应
   */
  async validateToken (token: string): Promise<TokenValidationResponse> {
    console.log('authService: 开始验证 Token')

    try {
      // 创建临时的 API 实例，避免依赖拦截器中的 store
      const baseURL = import.meta.env.VITE_API_BASE_URL
      const tempApi = axios.create({
        baseURL: `${baseURL}/auth`,
        timeout: 10_000,
      })

      const response = await tempApi.get('/user/validate', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      console.log('authService: Token 验证响应', response.data)

      return response.data && response.data.valid
        ? {
            valid: true,
          }
        : {
            valid: false,
            message: response.data?.message || 'Token 无效',
          }
    } catch (error: any) {
      console.error('authService: Token 验证失败', error)

      return {
        valid: false,
        message: 'Token 验证失败',
      }
    }
  },
}
