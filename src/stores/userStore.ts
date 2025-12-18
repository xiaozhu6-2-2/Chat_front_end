/**
 * 用户状态管理 Store - 精简版
 * 遵循 Pinia Composition API 模式
 * 参考 friendStore.ts 的实现风格
 * 不包含隐私设置、活跃度统计和搜索功能
 */

import type { User } from '@/types/user'
import { defineStore } from 'pinia'
import { computed, readonly, ref } from 'vue'

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

  /**
   * 设置用户信息（从API响应数据）
   *
   * 执行流程：
   * 1. 接收API响应的用户数据
   * 2. 更新currentUser状态
   * 3. 记录操作日志
   *
   * 数据流：
   * - 输入：API响应的用户数据
   * - 输出：更新 currentUser 状态
   *
   * 使用场景：
   * - Composable层获取用户数据后更新Store
   *
   * @param {User} user - API响应的用户数据
   */
  const setCurrentUserFromApi = (user: User): void => {
    currentUser.value = user
    console.log(`userStore: 设置当前用户`, { userId: user.id, username: user.name })
  }

  /**
   * 更新用户资料（从API响应数据）
   *
   * 执行流程：
   * 1. 接收API响应的用户更新数据
   * 2. 合并到现有用户信息
   * 3. 记录操作日志
   *
   * 数据流：
   * - 输入：API响应的用户更新数据
   * - 输出：更新 currentUser 状态
   *
   * 使用场景：
   * - 用户资料更新API成功后更新本地状态
   *
   * @param {Partial<User>} updates - API响应的用户更新数据
   */
  const updateUserFromApi = (updates: Partial<User>): void => {
    if (currentUser.value) {
      currentUser.value = { ...currentUser.value, ...updates }
      console.log(`userStore: 更新用户资料`, { updates })
    }
  }

  // 重置所有状态
  const reset = () => {
    clearCurrentUser()
    isLoading.value = false
    console.log(`userStore: 重置所有状态`)
  }

  return {
    // State (只读)
    currentUser: readonly(currentUser),
    isLoading: readonly(isLoading),

    // Computed
    isLoggedIn,
    currentUserId,
    currentUsername,
    currentUserAvatar,
    currentAccount,

    // 状态管理
    setLoading,
    setCurrentUser,
    updateCurrentUser,
    clearCurrentUser,

    // 纯数据管理方法（新增）
    setCurrentUserFromApi,
    updateUserFromApi,

    // 重置
    reset,
  }
})
