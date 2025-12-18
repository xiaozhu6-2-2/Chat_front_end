import type { AuthStorage, LoginResult, RegisterData } from '@/types/auth'
import { computed } from 'vue'
import { useSnackbar } from '@/composables/useSnackbar'
import { authService } from '@/service/authService'
import { websocketService } from '@/service/websocket'
import { useAuthStore } from '@/stores/authStore'
import { useChat } from './useChat'
import { useFriend } from './useFriend'
import { useFriendRequest } from './useFriendRequest'
import { useGroup } from './useGroup'
import { useGroupRequest } from './useGroupRequest'
import { useUser } from './useUser'

export function useAuth () {
  const authStore = useAuthStore()
  const { showSuccess, showError } = useSnackbar()

  // 计算属性 - 提供响应式的状态访问
  const isAuthenticated = computed(() => authStore.isAuthenticated)
  const token = computed(() => authStore.token)
  const userId = computed(() => authStore.userId)
  const username = computed(() => authStore.username)
  const isLoading = computed(() => authStore.isLoading)
  const rememberMe = computed(() => authStore.rememberMe)

  // 获取存储引擎
  const getStorage = (remember: boolean): Storage => {
    return remember ? localStorage : sessionStorage
  }

  // 从存储中获取认证信息
  const getStoredAuth = (storage: Storage): AuthStorage | null => {
    try {
      const authData = storage.getItem('auth')
      return authData ? JSON.parse(authData) : null
    } catch {
      return null
    }
  }

  // 验证 token
  const validateToken = async (): Promise<boolean> => {
    if (!token.value) {
      return false
    }

    try {
      const response = await authService.validateToken(token.value)
      return response.valid
    } catch (error) {
      throw error
    }
  }

  // 初始化服务
  const initializeServices = async () => {
    try {
      // await websocketService.connect(token.value, userId.value)
      // await messageService.init(token.value, userId.value)

      console.log('useAuth: 初始化服务')
    } catch (error) {
      showError(`服务初始化失败: ${error}`)
      throw error
    }

    // 初始化store，提前拉取数据
    try {
      // 初始化用户信息
      const { init: initUser } = useUser()
      await initUser(true) // 登录时强制初始化

      const { initializeChats, reset: resetChat } = useChat()
      await initializeChats(true) // 登录时强制初始化

      const { init: initFriend } = useFriend()
      await initFriend(true) // 登录时强制初始化

      const { init: initFriendRequest } = useFriendRequest()
      await initFriendRequest(true) // 登录时强制初始化

      const { init: initGroup } = useGroup()
      await initGroup(true) // 登录时强制初始化

      // 初始化群聊申请记录
      const { init: initGroupRequest } = useGroupRequest()
      await initGroupRequest(true) // 登录时强制初始化
      console.log('useAuth: 初始化store')
    } catch (error) {
      showError(`store初始化失败: ${error}`)
    }
  }

  // 从存储加载认证信息
  const loadAuthFromStorage = (): AuthStorage | null => {
    // 从本地读取
    let storedAuth: AuthStorage | null = null

    // 优先从 localStorage 读取（记住我状态）
    const localAuth = getStoredAuth(localStorage)
    if (localAuth?.token) {
      storedAuth = { ...localAuth, rememberMe: true }
    } else {
      // 再从 sessionStorage 读取
      const sessionAuth = getStoredAuth(sessionStorage)
      if (sessionAuth?.token) {
        storedAuth = { ...sessionAuth, rememberMe: false }
      }
    }

    // 如果没有找到认证信息，返回 null
    if (!storedAuth) {
      return null
    }

    // 设置认证信息到 store
    authStore.setAuth(storedAuth)

    return storedAuth
  }

  // 初始化认证模块
  // 在App.vue调用，true则跳转到home，false则跳转到login
  const init = async (): Promise<boolean> => {
    // 从存储加载认证信息
    const storedAuth = loadAuthFromStorage()

    // 如果没有找到认证信息，返回 false
    if (!storedAuth) {
      return false
    }

    // 如果获取成功，调用validate验证token有效性，失败则提示token失效，清理Storage, 返回false
    const isValid = await validateToken()
    if (!isValid) {
      showError('Token 已失效，请重新登录')
      // 清除所有存储
      localStorage.removeItem('auth')
      sessionStorage.removeItem('auth')
      // 重置状态
      authStore.clearAuthState()
      return false
    }

    // 如果认证成功，调用initializeServices，获取数据，失败则提示用户服务初始化失败，返回false
    try {
      await initializeServices()
      return true
    } catch (error) {
      showError(`服务初始化失败: ${error}`)
      // 清除所有存储
      localStorage.removeItem('auth')
      sessionStorage.removeItem('auth')
      // 重置状态
      authStore.clearAuthState()
      return false
    }
  }

  // 注册
  const register = async (userData: RegisterData): Promise<LoginResult> => {
    authStore.setLoading(true)

    try {
      console.log('useAuth: 开始注册流程，调用 authService')

      // 调用 authService 进行注册
      const response = await authService.register(userData)

      if (!response.success) {
        return {
          success: false,
          error: response.message || '注册失败',
          code: response.code,
        }
      }

      showSuccess('注册成功，请登录')
      return { success: true }
    } catch (error: any) {
      console.error('useAuth: 注册失败', error)
      return {
        success: false,
        error: error.message || '注册失败，请重试',
        code: error.code,
      }
    } finally {
      authStore.setLoading(false)
    }
  }

  // 登录
  const login = async (
    account: string,
    password: string,
    rememberMe = false,
  ): Promise<LoginResult> => {
    authStore.setLoading(true)

    try {
      console.log('useAuth: 开始登录流程，调用 authService')

      // 调用 authService 进行登录
      const response = await authService.login({
        account,
        password,
      })

      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.message || '登录失败',
          code: response.code,
        }
      }

      const authInfo: AuthStorage = {
        token: response.data.token,
        userId: response.data.userId,
        username: response.data.username,
        rememberMe,
      }

      console.log('useAuth: 登录成功，设置认证信息')

      // 设置认证信息
      authStore.setAuth(authInfo)

      // 选择存储位置并保存
      const storage = getStorage(rememberMe)
      const otherStorage = rememberMe ? sessionStorage : localStorage
      otherStorage.removeItem('auth') // 清除另一个存储
      storage.setItem('auth', JSON.stringify(authInfo))

      console.log('useAuth: 开始初始化服务')

      // 初始化服务
      await initializeServices()

      showSuccess('登录成功')
      return { success: true }
    } catch (error: any) {
      console.error('useAuth: 登录失败', error)
      return {
        success: false,
        error: error.message || '网络错误，请重试',
        code: error.code,
      }
    } finally {
      authStore.setLoading(false)
    }
  }

  // 登出
  const logout = async () => {
    // 断开 WebSocket
    websocketService.disconnect(false, 'logout')

    // 清除所有存储
    localStorage.removeItem('auth')
    sessionStorage.removeItem('auth')

    // 重置状态
    authStore.clearAuthState()

    // 清除用户相关信息
    const { reset: resetUser } = useUser()
    resetUser()

    // 重置聊天状态
    const { reset: resetChat } = useChat()
    resetChat()

    // 重置好友状态
    const { reset: resetFriend } = useFriend()
    resetFriend()

    // 重置好友请求状态
    const { reset: resetFriendRequest } = useFriendRequest()
    resetFriendRequest()

    // 重置群聊申请状态
    const { reset: resetGroupRequest } = useGroupRequest()
    resetGroupRequest()

    // 重置群聊状态
    const { reset: resetGroup } = useGroup()
    resetGroup()

    // 注意：路由跳转由调用方处理（例如在组件中调用后手动跳转）
    showSuccess('已退出登录')
  }

  // 更新记住我状态
  const updateRememberMe = async (rememberMe: boolean) => {
    if (authStore.rememberMe === rememberMe) {
      return
    }

    const currentStorage = getStorage(authStore.rememberMe)
    const newStorage = getStorage(rememberMe)

    // 从当前存储移除
    currentStorage.removeItem('auth')

    // 更新状态
    authStore.setRememberMe(rememberMe)

    // 保存到新存储
    const authInfo: AuthStorage = {
      token: token.value,
      userId: userId.value,
      username: username.value,
      rememberMe,
    }
    newStorage.setItem('auth', JSON.stringify(authInfo))
  }

  return {
    // 状态
    isAuthenticated,
    token,
    userId,
    username,
    isLoading,
    rememberMe,

    // 方法
    login,
    logout,
    init,
    validateToken,
    updateRememberMe,
    register,
  }
}
