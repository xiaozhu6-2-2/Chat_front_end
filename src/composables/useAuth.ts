import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useSnackbar } from '@/composables/useSnackbar'
import { websocketService } from '@/service/websocket'
import { friendService, messageService } from '@/service/message'
import { noauthApi, authApi } from '@/service/api'
import { generateSecureCredentials } from '@/service/crypto'
import type { AuthStorage, LoginResult } from '@/types/auth'
import { useFriendStore } from '@/stores/friendStore'
import { useChatStore } from '@/stores/chatStore'

export function useAuth() {
  const authStore = useAuthStore()
  const router = useRouter()
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
    if (!token.value) return false

    try {
      const response = await authApi.get('/user/validate')
      return response.data.valid
    } catch(error) {
      throw error
    }
  }

  // 初始化服务
  const initializeServices = async () => {
    try {
      await websocketService.connect(token.value, userId.value)
      await messageService.init(token.value, userId.value)

      console.log('useAuth: 初始化服务')
    } catch (err) {
      showError(`服务初始化失败: ${err}`)
      throw err
    }

    //初始化store，提前拉取数据
    try{
      
      const chatStore = useChatStore();
      await chatStore.fetchChatList();

      const friendStore = useFriendStore();
      await friendStore.fetchFriends();
      console.log('useAuth: 初始化store')
    }catch(err){
      showError(`store初始化失败: ${err}`)
    }
  }

  // 从存储加载认证信息
  const loadAuthFromStorage = async (storedAuth: AuthStorage | null) => {
    if (!storedAuth) return false

    authStore.setAuth(storedAuth)

    // 验证 token 是否仍然有效
    const isValid = await validateToken()
    if (!isValid) {
      logout()
      return false
    }

    // 初始化服务
    await initializeServices()
    return true
  }

  // 初始化认证状态
  const init = async () => {
    // 优先从 localStorage 读取（记住我状态）
    const localAuth = getStoredAuth(localStorage)
    if (localAuth?.token) {
      await loadAuthFromStorage({ ...localAuth, rememberMe: true })
      return
    }

    // 再从 sessionStorage 读取
    const sessionAuth = getStoredAuth(sessionStorage)
    if (sessionAuth?.token) {
      await loadAuthFromStorage({ ...sessionAuth, rememberMe: false })
    }
  }

  // 登录
  const login = async (
    account: string,
    password: string,
    rememberMe: boolean = false
  ): Promise<LoginResult> => {
    authStore.setLoading(true)

    try {
      // 加密账号密码
      const { encryptedAccount, encryptedPassword } = await generateSecureCredentials(account, password)
      if (!encryptedAccount || !encryptedPassword) {
        return {
          success: false,
          error: '加密失败'
        }
      }

      const response = await noauthApi.post('/auth/login', {
        account: encryptedAccount,
        password: encryptedPassword
      })

      const { token, uid, username } = response.data

      if (!token || !uid || !username) {
        return {
          success: false,
          error: '服务器返回数据异常'
        }
      }

      const authInfo: AuthStorage = {
        token,
        userId: uid,
        username,
        rememberMe
      }

      // 设置认证信息
      authStore.setAuth(authInfo)

      // 选择存储位置并保存
      const storage = getStorage(rememberMe)
      const otherStorage = rememberMe ? sessionStorage : localStorage
      otherStorage.removeItem('auth') // 清除另一个存储
      storage.setItem('auth', JSON.stringify(authInfo))

      // 初始化服务
      await initializeServices()

      showSuccess('登录成功')
      return { success: true }
    } catch (err: any) {
      return {
        success: false,
        error: '网络错误，请重试'
      }
    } finally {
      authStore.setLoading(false)
    }
  }

  // 登出
  const logout = () => {
    // 断开 WebSocket
    websocketService.disconnect(false, 'logout')

    // 清除所有存储
    localStorage.removeItem('auth')
    sessionStorage.removeItem('auth')

    // 重置状态
    authStore.clearAuthState()

    router.push('/login')

    showSuccess('已退出登录')
  }

  // 更新记住我状态
  const updateRememberMe = async (rememberMe: boolean) => {
    if (authStore.rememberMe === rememberMe) return

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
      rememberMe
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
    updateRememberMe
  }
}