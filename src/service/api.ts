import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';
import { setupInterceptors } from './httpInterceptor';

const baseURL = import.meta.env.VITE_API_BASE_URL
const noauthApi = axios.create({
  baseURL: `${baseURL}/noauth`,
  timeout: 10000, // 10秒超时
})
const authApi = axios.create({
  baseURL: `${baseURL}/auth`,
  timeout: 10000, // 10秒超时
})

// 额外的认证拦截器 - 添加token
authApi.interceptors.request.use(
  config => {
    const authStore = useAuthStore()
    const token = authStore.token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    // 发送请求是异步的过程，拦截器也是其中的一环，出错必须返回promise.reject
    // 如果直接返回error，实际上也是promiss.resolve，后续的.then会被执行
    return Promise.reject(error)
  }
)


// 导出初始化函数，在 Pinia 初始化后调用
export function setupApiInterceptors() {
  // 设置通用拦截器
  setupInterceptors(noauthApi)
  setupInterceptors(authApi)
}

//使用时直接 authApi.post('/FriendRequest', data)
//这样路径直接就是 'baseURL/auth/FriendRequest'，请求头也自带token
export { noauthApi, authApi }