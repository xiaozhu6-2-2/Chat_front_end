/**
 * 环境配置和工具函数
 * 用于区分开发环境和生产环境，并提供相应的配置
 */

// 环境类型枚举
export enum Environment {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  TEST = 'test',
}

/**
 * 获取当前环境类型
 * @returns 当前环境类型
 */
export function getCurrentEnvironment (): Environment {
  return import.meta.env.MODE as Environment
}

/**
 * 判断是否为开发环境
 * @returns 是否为开发环境
 */
export function isDevelopment (): boolean {
  return getCurrentEnvironment() === Environment.DEVELOPMENT
}

/**
 * 判断是否为生产环境
 * @returns 是否为生产环境
 */
export function isProduction (): boolean {
  return getCurrentEnvironment() === Environment.PRODUCTION
}

/**
 * 获取环境配置值
 * @param key 配置键名
 * @param defaultValue 默认值
 * @returns 配置值
 */
export function getEnvValue (key: string, defaultValue = ''): string {
  return import.meta.env[key] || defaultValue
}

/**
 * 环境配置对象
 */
export const envConfig = {
  // API配置
  apiBaseUrl: getEnvValue('VITE_API_BASE_URL'),
  wsUrl: getEnvValue('VITE_WS_URL'),

  // 功能开关
  useMockData: getEnvValue('VITE_USE_MOCK_DATA') === 'true',
  enableDebug: getEnvValue('VITE_ENABLE_DEBUG') === 'true',
  enableLog: getEnvValue('VITE_ENABLE_LOG') === 'true',

  // 用户配置（仅开发环境）
  mockUserId: getEnvValue('VITE_MOCK_USER_ID'),
  mockUserToken: getEnvValue('VITE_MOCK_USER_TOKEN'),
  mockUserName: getEnvValue('VITE_MOCK_USER_NAME'),

  // 聊天配置
  defaultGroupId: getEnvValue('VITE_DEFAULT_GROUP_ID'),
  defaultPrivateChatId: getEnvValue('VITE_DEFAULT_PRIVATE_CHAT_ID'),
}

/**
 * 环境日志函数 - 只在开发环境输出日志
 * @param message 日志消息
 * @param data 额外数据
 */
export function devLog (message: string, data?: any): void {
  if (envConfig.enableDebug) {
    console.log(`[DEV] ${message}`, data)
  }
}

/**
 * 环境错误日志函数
 * @param message 错误消息
 * @param error 错误对象
 */
export function envErrorLog (message: string, error?: any): void {
  if (envConfig.enableLog) {
    console.error(`[ENV] ${message}`, error)
  }
}
