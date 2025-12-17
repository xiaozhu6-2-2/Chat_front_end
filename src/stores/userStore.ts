/**
 * 用户状态管理 Store - 精简版
 * 遵循 Pinia Composition API 模式
 * 参考 friendStore.ts 的实现风格
 * 不包含隐私设置、活跃度统计和搜索功能
 */

import type { User, UserProfileUpdateOptions } from '@/types/user'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useSnackbar } from '@/composables/useSnackbar'
import { userService } from '@/service/userService'

const { showSuccess } = useSnackbar()

export const useUserStore = defineStore('user', () => {
  // State
  const currentUser = ref<User | null>(null) // 当前用户信息
  const isLoading = ref(false) // 加载状态

  // Computed
  // 是否已登录
  const isLoggedIn = computed(() => currentUser.value !== null)

  // 当前用户ID
  const currentUserId = computed(() => currentUser.value?.id || '')

  // 当前用户名
  const currentUsername = computed(() => currentUser.value?.name || '')

  // 当前用户头像
  const currentUserAvatar = computed(() => currentUser.value?.avatar || '')

  // 当前用户账号
  const currentAccount = computed(() => currentUser.value?.account || '')

  // Actions
  const setLoading = (loading: boolean) => {
    isLoading.value = loading
  }

  // 设置当前用户信息
  const setCurrentUser = (user: User) => {
    currentUser.value = user
    console.log(`userStore: 设置当前用户`, { userId: user.id, username: user.name })
  }

  // 更新当前用户信息
  const updateCurrentUser = (updates: Partial<User>) => {
    if (currentUser.value) {
      currentUser.value = { ...currentUser.value, ...updates }
      console.log(`userStore: 更新用户信息`, { updates })
    }
  }

  // 清除当前用户信息
  const clearCurrentUser = () => {
    currentUser.value = null
    console.log(`userStore: 清除用户信息`)
  }

  // 从 API 获取当前用户信息
  const fetchCurrentUser = async () => {
    if (currentUser.value) {
      console.log(`userStore: 用户信息已存在，跳过获取`)
      return currentUser.value
    }

    setLoading(true)
    try {
      const user = await userService.getCurrentUser()
      setCurrentUser(user)
      return user
    } catch (error) {
      console.error(`userStore: 获取用户信息失败`)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // 强制刷新用户信息
  const refreshCurrentUser = async () => {
    setLoading(true)
    try {
      const user = await userService.getCurrentUser()
      setCurrentUser(user)
      console.log(`userStore: 刷新用户信息成功`)
      showSuccess('刷新用户信息成功')
      return user
    } catch (error) {
      console.error(`userStore: 刷新用户信息失败`)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // 更新用户资料
  const updateUserProfile = async (options: UserProfileUpdateOptions) => {
    try {
      const updatedUser = await userService.updateProfile(options)
      updateCurrentUser(updatedUser)
      console.log('userStore: 更新用户资料成功')
      showSuccess('更新用户资料成功')
      return updatedUser
    } catch (error) {
      console.error(`userStore: 更新用户资料失败`, { options }, error)
      throw error
    }
  }

  // 重置所有状态
  const reset = () => {
    clearCurrentUser()
    isLoading.value = false
    console.log(`userStore: 重置所有状态`)
  }

  return {
    // State
    currentUser,
    isLoading,

    // Computed
    isLoggedIn,
    currentUserId,
    currentUsername,
    currentUserAvatar,
    currentAccount,

    // Actions
    setLoading,
    setCurrentUser,
    updateCurrentUser,
    clearCurrentUser,
    fetchCurrentUser,
    refreshCurrentUser,
    updateUserProfile,
    reset,
  }
})
