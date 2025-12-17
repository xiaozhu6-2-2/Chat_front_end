// snackbar是vuetify封装的消息条，用做全局的提示弹出，用pinia存储提示信息，应对连续弹出的场景
import { defineStore } from 'pinia'

interface SnackbarMessage {
  id: string
  text: string
  color?: 'success' | 'error' | 'warning' | 'info'
  timeout?: number
  show?: boolean
}

export const useSnackbarStore = defineStore('snackbar', {
  state: () => ({
    current: null as SnackbarMessage | null,
  }),

  actions: {
    // 显示消息
    show (text: string, options?: {
      color?: 'success' | 'error' | 'warning' | 'info'
      timeout?: number
    }) {
      const message: SnackbarMessage = {
        id: Date.now().toString(),
        text,
        color: options?.color || 'info',
        timeout: options?.timeout || 3000,
        show: true,
      }

      // 直接覆盖显示，新的挤掉旧的
      this.current = message
    },

    // 显示成功消息
    success (text: string, timeout?: number) {
      this.show(text, { color: 'success', timeout })
    },

    // 显示错误消息
    error (text: string, timeout?: number) {
      this.show(text, { color: 'error', timeout: timeout || 5000 })
    },

    // 显示警告消息
    warning (text: string, timeout?: number) {
      this.show(text, { color: 'warning', timeout })
    },

    // 显示信息消息
    info (text: string, timeout?: number) {
      this.show(text, { color: 'info', timeout })
    },

    // 关闭当前消息
    close () {
      if (this.current) {
        this.current.show = false
      }
    },

    // 处理消息关闭后的逻辑
    onClosed () {
      // 简单清空
      this.current = null
    },
  },
})
