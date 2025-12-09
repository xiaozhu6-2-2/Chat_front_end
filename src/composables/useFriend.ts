import { computed, ref } from 'vue'
import { useFriendStore } from '@/stores/friendStore'
import { messageService } from '@/service/message'
import type { FriendRequest } from '@/service/messageTypes'
import { devLog, isDevelopment } from '@/utils/env'

export function useFriend() {
  const friendStore = useFriendStore()
  const searchQuery = ref<string>('')
  const selectedTab = ref<'search' | 'requests'>('search')

  // Computed properties
  const searchResults = computed(() => friendStore.searchResults)
  const activeFriends = computed(() => friendStore.activeFriends)
  const pendingRequests = computed(() => friendStore.recentReceivedRequests)
  const sentRequests = computed(() => friendStore.recentSentRequests)
  const isLoading = computed(() => friendStore.isLoading)
  const pendingRequestCount = computed(() => friendStore.pendingRequestCount)
  const sentRequestCount = computed(() => friendStore.sentRequestCount)

  // Actions
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      friendStore.setSearchResults([])
      return
    }

    try {
      const results = await messageService.searchUsers(query.trim())
      friendStore.setSearchResults(results)
      devLog('Users searched', { query, resultsCount: results.length })
    } catch (error) {
      console.error('搜索用户失败:', error)
      // 可以在这里添加错误提示
    }
  }

  const sendFriendRequest = async (receiver_uid: string, apply_text?: string, tags?: string[]) => {
    try {
      const request = await messageService.sendFriendRequest(receiver_uid, apply_text, tags)
      friendStore.handleRequestSent(request)

      // 更新搜索结果中的状态
      friendStore.setSearchResults(
        friendStore.searchResults.map(user =>
          user.uid === receiver_uid
            ? { ...user, request_sent: true }
            : user
        )
      )

      devLog('Friend request sent', { receiver_uid, requestId: request.req_id, tags })
      return request
    } catch (error) {
      console.error('发送好友请求失败:', error)
      throw error
    }
  }

  const respondToFriendRequest = async (req_id: string, status: 'accepted' | 'rejected') => {
    try {
      await messageService.respondToFriendRequest(req_id, status)
      friendStore.handleFriendResponse(req_id, status)

      devLog('Friend request responded', { req_id, status })

      // 如果接受了请求，刷新好友列表
      if (status === 'accepted') {
        await loadFriends()
      }

      return { success: true }
    } catch (error) {
      console.error('响应好友请求失败:', error)
      throw error
    }
  }

  const loadFriends = async () => {
    try {
      const friends = await messageService.getFriends()
      friendStore.setFriends(friends)
      devLog('Friends loaded', { count: friends.length })
    } catch (error) {
      console.error('加载好友列表失败:', error)
      throw error
    }
  }

  const loadPendingRequests = async () => {
    try {
      const { receivedRequests, sentRequests } = await messageService.getPendingRequests()
      friendStore.setPendingRequests(receivedRequests)
      friendStore.setSentRequests(sentRequests)
      devLog('Pending requests loaded', {
        received: receivedRequests.length,
        sent: sentRequests.length
      })
    } catch (error) {
      console.error('加载好友请求失败:', error)
      throw error
    }
  }

  const removeFriend = async (friendId: string) => {
    try {
      await messageService.removeFriend(friendId)
      friendStore.removeFriend(friendId)
      devLog('Friend removed', { friendId })
    } catch (error) {
      console.error('删除好友失败:', error)
      throw error
    }
  }

  const updateFriendRemark = async (friendId: string, remark: string) => {
    try {
      await messageService.updateFriendRemark(friendId, remark)
      friendStore.updateFriend(friendId, { remark })
      devLog('Friend remark updated', { friendId, remark })
    } catch (error) {
      console.error('更新好友备注失败:', error)
      throw error
    }
  }

  const setFriendBlacklist = async (friendId: string, is_blacklist: boolean) => {
    try {
      await messageService.setFriendBlacklist(friendId, is_blacklist)
      friendStore.updateFriend(friendId, { is_blacklist })
      devLog('Friend blacklist status updated', { friendId, is_blacklist })
    } catch (error) {
      console.error('设置好友黑名单失败:', error)
      throw error
    }
  }

  const clearSearchResults = () => {
    friendStore.clearSearchResults()
    searchQuery.value = ''
  }

  const selectTab = (tab: 'search' | 'requests') => {
    selectedTab.value = tab

    // 切换到对应标签时加载相应数据
    if (tab === 'requests') {
      loadPendingRequests()
    }
  }

  // 检查用户关系的辅助函数
  const checkUserRelation = (uid: string) => {
    return {
      isFriend: friendStore.isFriend(uid),
      hasSentRequest: friendStore.hasSentRequest(uid),
      hasReceivedRequest: friendStore.hasReceivedRequest(uid)
    }
  }

  // 根据用户ID获取好友信息
  const getFriendByUid = (uid: string) => {
    return friendStore.getFriendByUid(uid)
  }

  // 刷新好友数据
  const refreshFriendData = async () => {
    try {
      await Promise.all([
        loadFriends(),
        loadPendingRequests()
      ])
      devLog('Friend data refreshed')
    } catch (error) {
      console.error('刷新好友数据失败:', error)
      throw error
    }
  }

  // 初始化好友功能
  const initializeFriendFeature = async () => {
    // 开发环境直接加载模拟数据
    if (isDevelopment()) {
      devLog('Initializing friend feature in development mode')
      await loadFriends()
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

      await loadFriends()
      await loadPendingRequests()

      devLog('Friend feature initialized successfully')
    } catch (error) {
      console.error('初始化好友功能失败:', error)
      throw error
    }
  }

  // 搜索防抖
  let searchTimeout: number | null = null
  const debouncedSearch = (query: string, delay = 500) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }

    searchTimeout = setTimeout(() => {
      searchUsers(query)
    }, delay)
  }

  return {
    // State
    searchQuery,
    selectedTab,
    searchResults,
    activeFriends,
    pendingRequests,
    sentRequests,
    isLoading,
    pendingRequestCount,
    sentRequestCount,

    // Actions
    searchUsers,
    sendFriendRequest,
    respondToFriendRequest,
    loadFriends,
    loadPendingRequests,
    removeFriend,
    updateFriendRemark,
    setFriendBlacklist,
    clearSearchResults,
    selectTab,
    checkUserRelation,
    getFriendByUid,
    refreshFriendData,
    initializeFriendFeature,
    debouncedSearch
  }
}