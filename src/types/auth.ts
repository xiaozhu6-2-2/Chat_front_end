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
