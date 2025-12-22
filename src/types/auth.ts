// 认证相关的类型定义

export interface AuthStorage {
  token: string
  userId: string
  username: string
  rememberMe: boolean
}

export interface LoginResult {
  success: boolean
  error?: string
  code?: number
}

// ========== API 请求类型 ==========

// 登录请求参数
export interface LoginCredentials {
  account: string
  password: string
}

// 注册请求参数
export interface RegisterData {
  account: string
  password: string
  username: string
  gender?: string
  region?: string
  bio?: string
  avatar?: string
}

// ========== API 响应类型 ==========

// 基础 API 响应结构
export interface BaseApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  code?: number
}

// 登录 API 响应
export interface LoginApiResponse {
  token: string
  userId: string
  username: string
}

// 注册 API 响应
export interface RegisterApiResponse {
  success: boolean
  message?: string
}

// Token 验证 API 响应
export interface TokenValidationApiResponse {
  valid: boolean
  userId?: string
  username?: string
}

// ========== 内部数据类型 ==========

// 登录响应数据（Service 层处理后）
export interface LoginResponse {
  success: boolean
  data?: {
    token: string
    userId: string
    username: string
  }
  message?: string
  code?: number
}

// 注册响应数据（Service 层处理后）
export interface RegisterResponse {
  success: boolean
  message?: string
  code?: number
}

// Token 验证响应（Service 层处理后）
export interface TokenValidationResponse {
  valid: boolean
  userId?: string
  username?: string
  message?: string
}

// 登录参数（加密后）
export interface EncryptedLoginParams {
  account: string
  password: string
  rememberMe?: boolean
}

// 注册参数（加密后）
export interface EncryptedRegisterParams {
  account: string
  password: string
  username: string
  gender: string | null
  region: string | null
  bio: string | null
  avatar: string
}

// ========== 数据转换函数 ==========

/**
 * 转换登录 API 响应为标准格式
 *
 * @param {any} response - 原始 API 响应
 * @returns {LoginResponse} 标准化的登录响应
 */
export function transformLoginResponse (response: any): LoginResponse {
  // 如果已经是标准格式，直接返回
  if (response && typeof response === 'object' && 'success' in response) {
    return response as LoginResponse
  }

  // 转换原始 API 响应
  if (response && response.data) {
    return {
      success: true,
      data: {
        token: response.data.token,
        userId: response.data.userId,
        username: response.data.username,
      },
    }
  }

  // 错误情况
  return {
    success: false,
    message: '登录响应格式错误',
  }
}

/**
 * 转换注册 API 响应为标准格式
 *
 * @param {any} response - 原始 API 响应
 * @returns {RegisterResponse} 标准化的注册响应
 */
export function transformRegisterResponse (response: any): RegisterResponse {
  // 如果已经是标准格式，直接返回
  if (response && typeof response === 'object' && 'success' in response) {
    return response as RegisterResponse
  }

  // 转换原始 API 响应
  if (response && response.status === 200) {
    return {
      success: true,
      message: '注册成功',
    }
  }

  // 错误情况
  return {
    success: false,
    message: response?.message || '注册失败',
  }
}

/**
 * 转换 Token 验证 API 响应为标准格式
 *
 * @param {any} response - 原始 API 响应
 * @returns {TokenValidationResponse} 标准化的验证响应
 */
export function transformTokenValidationResponse (response: any): TokenValidationResponse {
  // 如果已经是标准格式，直接返回
  if (response && typeof response === 'object' && 'valid' in response) {
    return response as TokenValidationResponse
  }

  // 转换原始 API 响应
  if (response && response.data) {
    return {
      valid: response.data.valid,
    }
  }

  // 错误情况
  return {
    valid: false,
    message: 'Token 验证响应格式错误',
  }
}

/**
 * 转换性别值
 *
 * @param {string} gender - 字符串格式的性别 ('male' | 'female')
 * @returns {number} 数字格式的性别 (1 | 2)
 */
export function transformGender (gender?: string): number | undefined {
  if (!gender) {
    return undefined
  }
  return gender === 'male' ? 1 : (gender === 'female' ? 2 : undefined)
}

/**
 * 准备注册请求数据
 *
 * @param {RegisterData} userData - 注册数据
 * @returns {EncryptedRegisterParams} 加密后的注册参数
 */
export function prepareRegisterParams (userData: RegisterData): EncryptedRegisterParams {
  return {
    account: userData.account,
    password: userData.password,
    username: userData.username,
    gender: userData.gender ?? null,
    region: userData.region ?? null,
    bio: userData.bio ?? null,
    avatar: userData.avatar ?? '1',
  }
}
