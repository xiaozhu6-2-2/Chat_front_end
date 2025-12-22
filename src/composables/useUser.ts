import type { User, UserProfileUpdateOptions } from '@/types/user'
import { userService } from '@/service/userService'
import { useUserStore } from '@/stores/userStore'
import { useSnackbar } from './useSnackbar'

export function useUser () {
  const userStore = useUserStore()
  const { showSuccess, showError } = useSnackbar()

  // ========== 核心业务逻辑 ==========

  /**
   * 获取当前用户信息
   *
   * 执行流程：
   * 1. 调用 userService 获取用户信息
   * 2. 转换数据格式（Service已完成转换）
   * 3. 更新 userStore
   * 4. 处理错误和用户反馈
   *
   * 数据流：
   * - 输入：无参数
   * - 输出：更新 store 中的用户信息
   * - 副作用：发送 HTTP 请求，显示用户反馈
   *
   * @returns {Promise<User>} 用户信息
   */
  const fetchCurrentUser = async (): Promise<User> => {
    userStore.setLoading(true)
    try {
      console.log('useUser: 开始获取当前用户信息')
      const user = await userService.getCurrentUser()

      // 更新本地状态
      userStore.setCurrentUserFromApi(user)

      console.log('useUser: 获取用户信息成功')
      return user
    } catch (error) {
      console.error('useUser: 获取用户信息失败', error)
      showError('获取用户信息失败，请刷新重试')
      throw error
    } finally {
      userStore.setLoading(false)
    }
  }

  /**
   * 强制刷新用户信息
   *
   * 执行流程：
   * 1. 调用 userService 获取最新用户信息
   * 2. 更新 userStore
   * 3. 处理成功/失败
   * 4. 显示用户反馈
   *
   * 数据流：
   * - 输入：无参数
   * - 输出：更新 store 中的用户信息
   * - 副作用：发送 HTTP 请求，显示用户反馈
   *
   * @returns {Promise<User>} 最新的用户信息
   */
  const refreshCurrentUser = async (): Promise<User> => {
    userStore.setLoading(true)
    try {
      console.log('useUser: 开始刷新用户信息')
      const user = await userService.getCurrentUser()

      // 更新本地状态
      userStore.setCurrentUserFromApi(user)

      console.log('useUser: 刷新用户信息成功')
      showSuccess('刷新用户信息成功')
      return user
    } catch (error) {
      console.error('useUser: 刷新用户信息失败', error)
      showError('刷新用户信息失败，请重试')
      throw error
    } finally {
      userStore.setLoading(false)
    }
  }

  /**
   * 更新用户资料
   *
   * 执行流程：
   * 1. 验证更新参数
   * 2. 调用 userService 更新资料
   * 3. 处理成功/失败
   * 4. 更新 userStore
   * 5. 显示用户反馈
   *
   * 数据流：
   * - 输入：更新参数
   * - 输出：更新 store 中的用户信息
   * - 副作用：发送 HTTP 请求，显示用户反馈
   *
   * @param {UserProfileUpdateOptions} options 更新选项
   * @returns {Promise<User>} 更新后的用户信息
   */
  const updateUserProfile = async (options: UserProfileUpdateOptions): Promise<User> => {
    try {
      console.log('useUser: 开始更新用户资料', options)

      // API请求体完整性：确保所有字段都包含，undefined设为null
      const apiOptions = {
        bio: options.bio ?? null,
        avatar: options.avatar ?? null,
      }

      const updatedUser = await userService.updateProfile(apiOptions)

      // 更新本地状态
      userStore.updateUserFromApi(updatedUser)

      console.log('useUser: 更新用户资料成功')
      showSuccess('更新用户资料成功')
      return updatedUser
    } catch (error) {
      console.error('useUser: 更新用户资料失败', error)
      showError(error.message || '更新用户资料失败，请重试')
      throw error
    }
  }

  /**
   * 上传头像 - 涉及多个步骤的业务逻辑
   *
   * 执行流程：
   * 1. 调用 userService 上传文件
   * 2. 更新本地用户状态
   * 3. 显示用户反馈
   *
   * 数据流：
   * - 输入：图片文件
   * - 输出：更新 store 中的头像信息
   * - 副作用：发送文件上传请求，显示用户反馈
   *
   * @param {File} file - 头像文件
   * @returns {Promise<string>} 头像URL
   */
  const uploadAvatar = async (file: File): Promise<string> => {
    try {
      console.log('useUser: 上传头像', file.name)
      const avatarUrl = await userService.uploadAvatar(file)

      // 更新 store 中的头像信息
      userStore.updateCurrentUser({ avatar: avatarUrl })

      // 显示成功提示
      showSuccess('头像上传成功')

      return avatarUrl
    } catch (error) {
      console.error('useUser: 上传头像失败', error)
      throw error
    }
  }

  // ========== 初始化和重置方法 ==========

  /**
   * 初始化用户模块
   *
   * 执行流程：
   * 1. 检查是否需要强制初始化
   * 2. 调用 fetchCurrentUser 获取用户信息
   * 3. 处理初始化错误
   *
   * 使用场景：
   * - 用户登录后初始化数据
   *
   * @param {boolean} force 是否强制初始化（默认true）
   * @returns {Promise<void>}
   */
  const init = async (force = true): Promise<void> => {
    if (!force && userStore.isLoggedIn) {
      console.log('useUser: 用户已登录，跳过获取用户信息')
      return
    }

    await fetchCurrentUser()
  }

  /**
   * 重置用户模块状态
   *
   * 使用场景：
   * - 用户登出时清理数据
   */
  const reset = (): void => {
    userStore.reset()
    console.log('useUser: 重置用户模块状态')
  }

  // ========== 便捷访问方法 ==========

  /**
   * 获取当前用户ID
   */
  const getCurrentUserId = (): string => {
    return userStore.currentUserId || ''
  }

  /**
   * 获取当前用户名
   */
  const getCurrentUsername = (): string => {
    return userStore.currentUsername || ''
  }

  /**
   * 获取当前用户头像
   */
  const getCurrentUserAvatar = (): string => {
    return userStore.currentUserAvatar || ''
  }

  /**
   * 获取完整的当前用户信息
   */
  const getCurrentUser = (): User | null => {
    return userStore.currentUser
  }

  // ========== 返回接口 ==========

  return {
    // 核心业务方法
    fetchCurrentUser,
    refreshCurrentUser,
    updateUserProfile,
    uploadAvatar,

    // 便捷访问方法
    getCurrentUserId,
    getCurrentUsername,
    getCurrentUserAvatar,
    getCurrentUser,

    // 初始化和重置
    init,
    reset,
  }
}
