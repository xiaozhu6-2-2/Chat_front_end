import { defineStore } from 'pinia'
import type { AuthStorage } from '@/types/auth'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: '',
    userId: '',
    username: '',
    isAuthenticated: false,
    isLoading: false,
    rememberMe: false
  }),

  actions: {
    // 设置认证信息
    setAuth(authInfo: AuthStorage) {
      this.token = authInfo.token
      this.userId = authInfo.userId
      this.username = authInfo.username
      this.rememberMe = authInfo.rememberMe || false
      this.isAuthenticated = true
    },

    // 设置加载状态
    setLoading(loading: boolean) {
      this.isLoading = loading
    },

    // 设置记住我状态
    setRememberMe(rememberMe: boolean) {
      this.rememberMe = rememberMe
    },

    // 登出 - 仅清理状态
    clearAuthState() {
      // 重置状态
      this.token = ''
      this.userId = ''
      this.username = ''
      this.isAuthenticated = false
      this.rememberMe = false
      this.isLoading = false
    }
  }
})