import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { FriendRequest, UserSearchResult } from '@/service/messageTypes'
import { friendService } from '@/service/friendService'
import { useFriendStore } from './friendStore'

export const useRequestAndSearchStore = defineStore('requestAndSearch', () => {
  // State - Requests
  const pendingRequests = ref<Map<string, FriendRequest>>(new Map())
  const sentRequests = ref<Map<string, FriendRequest>>(new Map())
  const isLoading = ref(false)

  // State - Search
  const searchResults = ref<UserSearchResult[]>([])
  const selectedTab = ref<'search' | 'requests'>('search')
  const searchQuery = ref<string>('')
  const isLoadingSearch = ref(false)

  // Computed - Requests
  const pendingRequestCount = computed(() => {
    return Array.from(pendingRequests.value.values())
      .filter(request => request.status === 'pending').length
  })

  const sentRequestCount = computed(() => {
    return Array.from(sentRequests.value.values())
      .filter(request => request.status === 'pending').length
  })

  const recentReceivedRequests = computed(() => {
    return Array.from(pendingRequests.value.values())
      .filter(request => request.status === 'pending')
      .sort((a, b) => new Date(b.create_time).getTime() - new Date(a.create_time).getTime())
      .slice(0, 10)
  })

  const recentSentRequests = computed(() => {
    return Array.from(sentRequests.value.values())
      .sort((a, b) => new Date(b.create_time).getTime() - new Date(a.create_time).getTime())
      .slice(0, 10)
  })

  const hasSentRequest = computed(() => {
    return (receiver_uid: string) => {
      return Array.from(sentRequests.value.values())
        .some(request =>
          request.receiver_uid === receiver_uid &&
          request.status === 'pending'
        )
    }
  })

  const hasReceivedRequest = computed(() => {
    return (sender_uid: string) => {
      return Array.from(pendingRequests.value.values())
        .some(request =>
          request.sender_uid === sender_uid &&
          request.status === 'pending'
        )
    }
  })

  // Overall loading state
  const overallIsLoading = computed(() => isLoading.value || isLoadingSearch.value)

  // Actions
  const setLoading = (loading: boolean) => {
    isLoading.value = loading
  }

  const setLoadingSearch = (loading: boolean) => {
    isLoadingSearch.value = loading
  }

  // Request Actions
  const addPendingRequest = (request: FriendRequest) => {
    pendingRequests.value.set(request.req_id, request)
  }

  const addSentRequest = (request: FriendRequest) => {
    sentRequests.value.set(request.req_id, request)
  }

  const updateRequestStatus = (reqId: string, status: FriendRequest['status'], handle_time?: string) => {
    // 更新收到的请求
    const receivedRequest = pendingRequests.value.get(reqId)
    if (receivedRequest) {
      pendingRequests.value.set(reqId, {
        ...receivedRequest,
        status,
        handle_time: handle_time || new Date().toISOString()
      })
    }

    // 更新发送的请求
    const sentRequest = sentRequests.value.get(reqId)
    if (sentRequest) {
      sentRequests.value.set(reqId, {
        ...sentRequest,
        status,
        handle_time: handle_time || new Date().toISOString()
      })
    }
  }

  const removeRequest = (reqId: string) => {
    pendingRequests.value.delete(reqId)
    sentRequests.value.delete(reqId)
  }

  const setPendingRequests = (requests: FriendRequest[]) => {
    pendingRequests.value.clear()
    requests.forEach(request => {
      pendingRequests.value.set(request.req_id, request)
    })
  }

  const setSentRequests = (requests: FriendRequest[]) => {
    sentRequests.value.clear()
    requests.forEach(request => {
      sentRequests.value.set(request.req_id, request)
    })
  }

  /**
   * 处理好友请求响应
   * @param reqId 请求ID
   * @param status 响应状态
   */
  const handleFriendResponse = async (reqId: string, status: 'accepted' | 'rejected') => {
    try {
      // 调用服务响应好友请求
      await friendService.respondToFriendRequest(reqId, status)

      // 如果接受了请求，需要从 friendService 获取好友信息并添加到 friendStore
      if (status === 'accepted') {
        const friendStore = useFriendStore()
        // 刷新好友列表以包含新添加的好友
        await friendStore.fetchFriends(true)
      }

      // 更新请求状态
      updateRequestStatus(reqId, status)
    } catch (error) {
      console.error('处理好友请求失败:', error)
      throw error
    }
  }

  /**
   * 发送好友请求
   * @param receiverUid 接收者用户ID
   * @param message 申请消息
   * @param tags 标签（可选）
   */
  const sendFriendRequest = async (receiverUid: string, message?: string, tags?: string[]) => {
    setLoading(true)
    try {
      const request = await friendService.createFriendRequest(receiverUid, message, tags)
      addSentRequest(request)
      return request
    } catch (error) {
      console.error('发送好友请求失败:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  /**
   * 获取所有待处理的好友请求
   * @param forceRefresh 是否强制刷新
   */
  const fetchPendingRequests = async (forceRefresh = false) => {
    if (!forceRefresh && (pendingRequests.value.size > 0 || sentRequests.value.size > 0)) {
      return
    }

    setLoading(true)
    try {
      const { receivedRequests, sentRequests } = await friendService.getPendingRequests()
      setPendingRequests(receivedRequests)
      setSentRequests(sentRequests)
    } catch (error) {
      console.error('获取好友请求失败:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Search Actions
  const setSearchResults = (results: UserSearchResult[]) => {
    searchResults.value = results
  }

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setLoadingSearch(true)
    try {
      const results = await friendService.searchUsers(query.trim())
      setSearchResults(results)

      // 更新搜索结果中的状态，标记已发送请求的用户
      const updatedResults = results.map(user =>
        hasSentRequest.value(user.uid)
          ? { ...user, request_sent: true }
          : user
      )
      setSearchResults(updatedResults)
    } catch (error) {
      console.error('搜索用户失败:', error)
      throw error
    } finally {
      setLoadingSearch(false)
    }
  }

  const clearSearchResults = () => {
    setSearchResults([])
    searchQuery.value = ''
  }

  // Tab management
  const selectTab = (tab: 'search' | 'requests') => {
    selectedTab.value = tab
    // 加载待处理请求
    if (tab === 'requests') {
      fetchPendingRequests()
    }
  }

  // Helper functions
  const checkUserRelation = (uid: string) => {
    return {
      isFriend: useFriendStore().isFriend(uid),
      hasSentRequest: hasSentRequest.value(uid),
      hasReceivedRequest: hasReceivedRequest.value(uid)
    }
  }

  // Clear functions
  const clearRequests = () => {
    pendingRequests.value.clear()
    sentRequests.value.clear()
    isLoading.value = false
  }

  const reset = () => {
    clearRequests()
    clearSearchResults()
    selectedTab.value = 'search'
    isLoading.value = false
    isLoadingSearch.value = false
  }

  return {
    // State
    selectedTab,
    searchQuery,
    pendingRequests,
    sentRequests,
    searchResults,
    isLoading,
    isLoadingSearch,
    overallIsLoading,

    // Computed
    pendingRequestCount,
    sentRequestCount,
    recentReceivedRequests,
    recentSentRequests,
    hasSentRequest,
    hasReceivedRequest,

    // Actions
    selectTab,
    setLoading,
    setLoadingSearch,

    // Request actions
    addPendingRequest,
    addSentRequest,
    updateRequestStatus,
    removeRequest,
    setPendingRequests,
    setSentRequests,
    handleFriendResponse,
    sendFriendRequest,
    fetchPendingRequests,

    // Search actions
    setSearchResults,
    searchUsers,
    clearSearchResults,

    // Helper
    checkUserRelation,

    // Clear
    clearRequests,
    reset
  }
})