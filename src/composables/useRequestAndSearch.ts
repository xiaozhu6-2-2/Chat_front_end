import { computed, ref } from 'vue'
import { useRequestAndSearchStore } from '@/stores/requestAndSearchStore'
import { devLog, isDevelopment } from '@/utils/env'

export function useRequestAndSearch() {
  const store = useRequestAndSearchStore()

  // 搜索防抖
  let searchTimeout: number | null = null
  const debouncedSearch = (query: string, delay = 500) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }

    searchTimeout = setTimeout(() => {
      store.searchUsers(query)
    }, delay)
  }

  // Computed properties
  const pendingRequests = computed(() => store.recentReceivedRequests)
  const sentRequests = computed(() => store.recentSentRequests)
  const isLoading = computed(() => store.overallIsLoading)
  const isLoadingRequests = computed(() => store.isLoading)
  const isLoadingSearch = computed(() => store.isLoadingSearch)
  const pendingRequestCount = computed(() => store.pendingRequestCount)
  const sentRequestCount = computed(() => store.sentRequestCount)
  const hasSentRequest = computed(() => store.hasSentRequest)
  const hasReceivedRequest = computed(() => store.hasReceivedRequest)

  // Search related
  const searchResults = computed(() => store.searchResults)
  const searchQuery = computed(() => store.searchQuery)
  const selectedTab = computed(() => store.selectedTab)

  // Actions
  const sendFriendRequest = async (receiverUid: string, message?: string, tags?: string[]) => {
    try {
      const request = await store.sendFriendRequest(receiverUid, message, tags)
      devLog('Friend request sent', { receiverUid, message })
      return request
    } catch (error) {
      console.error('发送好友请求失败:', error)
      throw error
    }
  }

  const respondToFriendRequest = async (reqId: string, status: 'accepted' | 'rejected') => {
    try {
      await store.handleFriendResponse(reqId, status)
      devLog('Friend request responded', { reqId, status })
      return { success: true }
    } catch (error) {
      console.error('响应好友请求失败:', error)
      throw error
    }
  }

  const loadPendingRequests = async (forceRefresh = false) => {
    try {
      await store.fetchPendingRequests(forceRefresh)
      devLog('Pending requests loaded', {
        received: store.pendingRequestCount,
        sent: store.sentRequestCount
      })
    } catch (error) {
      console.error('加载好友请求失败:', error)
      throw error
    }
  }

  const initializeRequestFeature = async () => {
    // 开发环境直接加载模拟数据
    if (isDevelopment()) {
      devLog('Initializing request feature in development mode')
      await loadPendingRequests()
      return
    }

    // 生产环境需要先检查用户登录状态
    try {
      // TODO: 检查用户登录状态
      // const isUserLoggedIn = await checkUserLoginStatus()
      // if (!isUserLoggedIn) {
      //   throw new Error('用户未登录')
      // }

      await loadPendingRequests()

      devLog('Request feature initialized successfully')
    } catch (error) {
      console.error('初始化请求功能失败:', error)
      throw error
    }
  }

  const clearRequests = () => {
    store.clearRequests()
    devLog('Requests cleared')
  }

  return {
    // State
    selectedTab,
    searchQuery,
    searchResults,
    pendingRequests,
    sentRequests,
    isLoading,
    isLoadingRequests,
    isLoadingSearch,

    // Computed
    pendingRequestCount,
    sentRequestCount,
    hasSentRequest,
    hasReceivedRequest,

    // Actions
    selectTab: store.selectTab,
    searchUsers: store.searchUsers,
    sendFriendRequest,
    respondToFriendRequest,
    loadPendingRequests,
    initializeRequestFeature,
    clearRequests,
    clearSearchResults: store.clearSearchResults,
    debouncedSearch,
    checkUserRelation: store.checkUserRelation
  }
}