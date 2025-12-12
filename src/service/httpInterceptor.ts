import type { AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios'
import { useSnackbarStore } from '@/stores/snackbarStore'
import { useAuthStore } from '@/stores/authStore'

// 标准化的API响应格式
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  code: number
  message: string
  timestamp?: number
}

// 后端错误响应格式（完全匹配后端ErrorResponse）
export interface ErrorResponse {
  code: number  // HTTP状态码
  message: string  // 错误消息
  details?: string  // 可选的详细信息
}

// 业务错误类型（帮助前端识别具体错误）
export const BusinessErrorType = {
  // 认证相关
  INVALID_PASSWORD: 401,  // 密码错误

  // 权限相关
  FORBIDDEN: 403,  // 权限验证失败

  // 资源相关
  USER_NOT_FOUND: 404,  // 用户不存在
  NOT_FOUND: 404,  // 资源未找到

  // 请求参数相关
  DECRYPTION_FAILURE: 400,  // 解密失败
  RECIPIENT_NOT_FOUND: 400,  // 消息未指定接收者
  PAGE_OUT_OF_RANGE: 400,  // 分页参数超出范围
  BAD_REQUEST: 400,  // 请求参数错误

  // 资源冲突
  DUPLICATE_USER: 409,  // 用户已存在

  // 服务器错误
  DATABASE_FAILURE: 500,  // 数据库操作失败
  STATE_GENERATION_FAILURE: 500,  // 应用状态实例创建失败
  HASH_FAILURE: 500,  // 密码哈希解析失败
  TOKEN_GENERATION_FAILURE: 500,  // JWT令牌生成失败
  MPCS_SENDER_FAILURE: 500,  // mpcs sender发送失败
  SERIALIZE_FAILURE: 500,  // 序列化错误
  BROADCAST_SENDER_FAILURE: 500,  // broadcast发送失败
  DATABASE_CONNECTION_FAILURE: 500,  // 数据库连接失败
  SERVER_START_FAILURE: 500,  // 服务器启动失败
  PUB_KEY_TRANSITION_FAILURE: 500,  // 公钥转换失败
  REDIS_GET_CONN_FAILURE: 500,  // Redis连接池获取失败
  REDIS_OPERATION_FAILURE: 500,  // Redis操作失败
  SNOWFLAKE_FAILURE: 500,  // 雪花算法生成失败
  TASK_MANAGER_ERROR: 500,  // 群聊任务管理发生错误
} as const

// 自定义错误类
export class ApiError extends Error {
  constructor(
    public code: number,
    message: string,
    public data?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// 后端AppError对应的HTTP状态码映射
const errorMessages: Record<number, string> = {
  // 400 Bad Request
  400: '请求参数错误',

  // 401 Unauthorized
  401: '密码错误',

  // 403 Forbidden
  403: '权限验证失败',

  // 404 Not Found
  404: '资源未找到',

  // 409 Conflict
  409: '资源已存在',

  // 429 Too Many Requests
  429: '请求过于频繁，请稍后再试',

  // 500 Internal Server Error
  500: '服务器内部错误',

  // 502 Bad Gateway
  502: '网关错误',

  // 503 Service Unavailable
  503: '服务暂时不可用',

  // 504 Gateway Timeout
  504: '网关超时',
}

// 生成请求ID
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}


// 设置请求拦截器
export function setupRequestInterceptor(axiosInstance: any) {
  axiosInstance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // 添加请求ID
      config.headers = config.headers || {}
      config.headers['X-Request-ID'] = generateRequestId()

      // 添加时间戳
      config.headers['X-Timestamp'] = Date.now().toString()

      return config
    },
    (error: AxiosError) => {
      return Promise.reject(error)
    }
  )
}

// 设置响应拦截器
export function setupResponseInterceptor(axiosInstance: any) {
  // 创建 snackbar store 实例
  const snackbarStore = useSnackbarStore()

  axiosInstance.interceptors.response.use(
    (response: AxiosResponse<ApiResponse>) => {
      // 处理业务响应
      const data = response.data

      // 如果后端返回的格式是标准的 success 字段
      if (data && typeof data === 'object' && 'success' in data) {
        if (data.success) {
          return response
        } else {
          // 业务失败，抛出错误
          const error = new ApiError(
            data.code || 500,
            data.message || '请求失败',
            data.data
          )
          return Promise.reject(error)
        }
      }

      // 如果后端返回的是旧格式（直接返回数据）
      return response
    },
    (error: AxiosError) => {
      // 处理HTTP错误

      // 网络错误
      if (!error.response) {
        const message = '网络连接失败，请检查网络设置'
        console.error(message)
        snackbarStore.error(message, 5000)

        const networkError = new Error(message)
        ;(networkError as any).code = 'NETWORK_ERROR'
        return Promise.reject(networkError)
      }

      const { status, data } = error.response

      // 后端返回的错误格式
      const errorData = data as ErrorResponse

      // 401 未授权 - 清除登录信息
      if (status === 401 || errorData?.code === 401) {
        const authStore = useAuthStore();
        authStore.clearAuthState();
        const message = errorData?.message || '登录已过期，请重新登录'
        console.warn(message)
        snackbarStore.warning(message)

        const authError = new Error(message)
        ;(authError as any).code = 'AUTH_EXPIRED'
        ;(authError as any).status = 401
        ;(authError as any).details = errorData?.details
        return Promise.reject(authError)
      }

      // 其他HTTP错误 - 使用后端返回的错误信息
      const message = errorData?.message || errorMessages[status] || '请求失败'
      const errorCode = errorData?.code || status

      // 根据错误码进行特殊处理
      console.error(`[错误 ${errorCode}] ${message}`)

      // 使用 Snackbar 显示错误
      if (status >= 500) {
        snackbarStore.error(message, 5000)  // 服务器错误显示5秒
      } else if (status === 429) {
        snackbarStore.warning(message, 4000)  // 频率限制显示4秒
      } else {
        snackbarStore.error(message, 4000)  // 其他错误显示4秒
      }

      const httpError = new Error(message)
      ;(httpError as any).code = errorCode
      ;(httpError as any).status = status
      ;(httpError as any).details = errorData?.details

      return Promise.reject(httpError)
    }
  )
}

// 便捷的设置函数
export function setupInterceptors(axiosInstance: any) {
  setupRequestInterceptor(axiosInstance)
  setupResponseInterceptor(axiosInstance)
  return axiosInstance
}