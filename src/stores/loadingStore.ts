import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useLoadingStore = defineStore('loading', () => {
  const isLoading = ref(false)
  const loadingMessage = ref('加载中...')

  const setLoading = (loading: boolean, message = '加载中...') => {
    isLoading.value = loading
    loadingMessage.value = message
  }

  const showLoading = (message = '加载中...') => {
    setLoading(true, message)
  }

  const hideLoading = () => {
    setLoading(false)
  }

  return {
    isLoading,
    loadingMessage,
    setLoading,
    showLoading,
    hideLoading
  }
})