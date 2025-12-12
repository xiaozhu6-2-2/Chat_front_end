// stores/userStore.ts
// 用户信息状态管理
// 职责：
// - 管理当前用户信息（UserProfile）
// - 提供更新和加载用户信息的方法
// - 使用 localStorage 持久化用户数据

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { UserProfile } from '@/service/messageTypes'

// 默认用户配置
const DEFAULT_USER_ID = 'test-user-001'
const STORAGE_KEY = 'echat_user_profile'

// 默认用户资料
const getDefaultProfile = (): UserProfile => ({
  uid: DEFAULT_USER_ID,
  username: '测试用户',
  account: 'testuser',
  gender: 'other',
  region: '',
  email: '',
  create_time: new Date().toISOString(),
  avatar: '',
  bio: ''
})

export const useUserStore = defineStore('user', () => {
  // State
  const currentUser = ref<UserProfile>(getDefaultProfile())
  const isLoading = ref(false)

  // Computed
  const isLoggedIn = computed(() => !!currentUser.value.uid)

  const userAvatar = computed(() => currentUser.value.avatar || '')

  const userDisplayName = computed(() => currentUser.value.username || '未知用户')

  // Actions

  // 从 localStorage 加载用户资料
  const loadProfile = (userId?: string): UserProfile | null => {
    try {
      const targetUserId = userId || DEFAULT_USER_ID
      const stored = localStorage.getItem(`${STORAGE_KEY}_${targetUserId}`)

      if (stored) {
        const profile = JSON.parse(stored) as UserProfile
        currentUser.value = profile
        return profile
      }

      // 如果没有存储的数据，使用默认数据并保存
      currentUser.value = getDefaultProfile()
      saveProfile(currentUser.value)
      return currentUser.value
    } catch (error) {
      console.error('加载用户资料失败:', error)
      currentUser.value = getDefaultProfile()
      return null
    }
  }

  // 更新用户资料
  const updateProfile = async (updates: Partial<UserProfile>): Promise<boolean> => {
    try {
      isLoading.value = true

      // 合并更新数据
      const updatedProfile: UserProfile = {
        ...currentUser.value,
        ...updates,
        uid: currentUser.value.uid // 确保 uid 不被修改
      }

      // 保存到 state
      currentUser.value = updatedProfile

      // 持久化到 localStorage
      saveProfile(updatedProfile)

      return true
    } catch (error) {
      console.error('更新用户资料失败:', error)
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 保存用户资料到 localStorage
  const saveProfile = (profile: UserProfile): void => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_${profile.uid}`, JSON.stringify(profile))
    } catch (error) {
      console.error('保存用户资料失败:', error)
    }
  }

  // 更新头像
  const updateAvatar = async (avatarUrl: string): Promise<boolean> => {
    return updateProfile({ avatar: avatarUrl })
  }

  // 清除用户资料（登出时使用）
  const clearProfile = (): void => {
    try {
      if (currentUser.value.uid) {
        localStorage.removeItem(`${STORAGE_KEY}_${currentUser.value.uid}`)
      }
      currentUser.value = getDefaultProfile()
    } catch (error) {
      console.error('清除用户资料失败:', error)
    }
  }

  // 检查用户资料是否完整
  const isProfileComplete = computed(() => {
    const profile = currentUser.value
    return !!(
      profile.username &&
      profile.account &&
      profile.email &&
      profile.gender &&
      profile.region
    )
  })

  // 获取用户资料完成度
  const profileCompletionRate = computed(() => {
    const profile = currentUser.value
    const fields = [
      'username',
      'account',
      'email',
      'gender',
      'region',
      'avatar',
      'bio'
    ]
    const completedFields = fields.filter(field => {
      const value = profile[field as keyof UserProfile]
      return value !== undefined && value !== null && value !== ''
    })

    return Math.round((completedFields.length / fields.length) * 100)
  })

  // 初始化 store 时自动加载用户资料
  const initialize = () => {
    loadProfile()
  }

  return {
    // State
    currentUser,
    isLoading,

    // Computed
    isLoggedIn,
    userAvatar,
    userDisplayName,
    isProfileComplete,
    profileCompletionRate,

    // Actions
    loadProfile,
    updateProfile,
    updateAvatar,
    saveProfile,
    clearProfile,
    initialize
  }
})

// 导出默认用户 ID 供其他组件使用
export { DEFAULT_USER_ID }