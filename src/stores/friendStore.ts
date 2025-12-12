// stores/friendStore.ts
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type {
  UserProfile,
  UserSearchResult,
  FriendWithUserInfo,
  FriendRequest
} from '@/service/messageTypes'
import { devLog, isDevelopment } from '@/utils/env'

export const useFriendStore = defineStore('friend', () => {
  // State
  const friends = ref<Map<string, FriendWithUserInfo>>(new Map())  // fid -> friend info
  const pendingRequests = ref<Map<string, FriendRequest>>(new Map()) // req_id -> request (我收到的请求)
  const sentRequests = ref<Map<string, FriendRequest>>(new Map())   // req_id -> request (我发送的请求)
  const searchResults = ref<UserSearchResult[]>([])
  const isLoading = ref(false)

  // 初始化一些测试好友数据（仅开发环境）
  if (isDevelopment()) {
    // 添加张三为好友
    friends.value.set('friend-001', {
      fid: 'friend-001',
      uid: 'user-001',
      to_uid: 'test-user-001',
      create_time: '2024-01-01T00:00:00Z',
      is_blacklist: false,
      remark: '张三-同事',
      tag: '同事',
      user_info: {
        uid: 'user-001',
        username: '张三',
        account: 'zhangsan',
        gender: 'male',
        region: '北京',
        email: 'zhangsan@example.com',
        create_time: '2024-01-01T00:00:00Z',
        avatar: 'https://cdn.vuetifyjs.com/images/john.jpg',
        bio: '这是张三的个人简介'
      }
    })

    // 添加李四为好友
    friends.value.set('friend-002', {
      fid: 'friend-002',
      uid: 'user-002',
      to_uid: 'test-user-001',
      create_time: '2024-01-02T00:00:00Z',
      is_blacklist: false,
      remark: '李四-好友',
      tag: '朋友',
      user_info: {
        uid: 'user-002',
        username: '李四',
        account: 'lisi',
        gender: 'female',
        region: '上海',
        email: 'lisi@example.com',
        create_time: '2024-01-02T00:00:00Z',
        avatar: 'https://cdn.vuetifyjs.com/images/lists/1.jpg',
        bio: '这是李四的个人简介'
      }
    })

    devLog('Mock friends initialized', { count: friends.value.size })
  }

  // Computed
  const activeFriends = computed(() => {
    return Array.from(friends.value.values())
      .filter(friend => !friend.is_blacklist)
      .sort((a, b) => new Date(b.create_time).getTime() - new Date(a.create_time).getTime())
  })

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

  const getFriendByUid = computed(() => {
    return (uid: string) => {
      return Array.from(friends.value.values())
        .find(friend => friend.uid === uid)
    }
  })

  const isFriend = computed(() => {
    return (uid: string) => {
      return Array.from(friends.value.values())
        .some(friend => friend.uid === uid && !friend.is_blacklist)
    }
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

  // 标签相关计算属性
  const getFriendsByTag = computed(() => {
    return (tag: string) => {
      return Array.from(friends.value.values())
        .filter(friend => friend.tag === tag && !friend.is_blacklist)
    }
  })

  const getAllTags = computed(() => {
    const tags = new Set<string>()
    Array.from(friends.value.values()).forEach(friend => {
      if (friend.tag) tags.add(friend.tag)
    })
    return Array.from(tags).sort()
  })

  const getTagStats = computed(() => {
    const stats: Record<string, number> = {}
    Array.from(friends.value.values()).forEach(friend => {
      if (friend.tag) {
        stats[friend.tag] = (stats[friend.tag] || 0) + 1
      }
    })
    return stats
  })

  // Actions
  const setLoading = (loading: boolean) => {
    isLoading.value = loading
  }

  const setSearchResults = (results: UserSearchResult[]) => {
    searchResults.value = results
  }

  const addFriend = (friend: FriendWithUserInfo) => {
    friends.value.set(friend.fid, friend)
  }

  const removeFriend = (friendId: string) => {
    friends.value.delete(friendId)
  }

  const updateFriend = (friendId: string, updates: Partial<FriendWithUserInfo>) => {
    const friend = friends.value.get(friendId)
    if (friend) {
      friends.value.set(friendId, { ...friend, ...updates })
    }
  }

  const addPendingRequest = (request: FriendRequest) => {
    pendingRequests.value.set(request.req_id, request)
  }

  const addSentRequest = (request: FriendRequest) => {
    sentRequests.value.set(request.req_id, request)
  }

  const updateRequestStatus = (reqId: string, status: FriendRequest['status'], handle_time?: string) => {
    // 更新我收到的请求
    const receivedRequest = pendingRequests.value.get(reqId)
    if (receivedRequest) {
      pendingRequests.value.set(reqId, {
        ...receivedRequest,
        status,
        handle_time: handle_time || new Date().toISOString()
      })
    }

    // 更新我发送的请求
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

  const setFriends = (friendList: FriendWithUserInfo[]) => {
    friends.value.clear()
    friendList.forEach(friend => {
      friends.value.set(friend.fid, friend)
    })
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

  const clearSearchResults = () => {
    searchResults.value = []
  }

  const reset = () => {
    friends.value.clear()
    pendingRequests.value.clear()
    sentRequests.value.clear()
    searchResults.value = []
    isLoading.value = false
  }

  const handleFriendResponse = (reqId: string, status: 'accepted' | 'rejected') => {
    const request = pendingRequests.value.get(reqId)
    if (request && status === 'accepted') {
      console.log('Friend request accepted:', reqId)
    }

    updateRequestStatus(reqId, status)
  }

  const handleRequestSent = (request: FriendRequest) => {
    addSentRequest(request)
  }

  // 标签相关actions
  const updateFriendTag = (friendId: string, tag: string | null) => {
    updateFriend(friendId, { tag: tag || undefined })
  }

  const removeFriendTag = (friendId: string) => {
    updateFriendTag(friendId, null)
  }

  const batchUpdateTags = (updates: { friendId: string, tag: string | null }[]) => {
    updates.forEach(({ friendId, tag }) => {
      updateFriendTag(friendId, tag)
    })
  }

  return {
    // State
    friends,
    pendingRequests,
    sentRequests,
    searchResults,
    isLoading,

    // Computed
    activeFriends,
    pendingRequestCount,
    sentRequestCount,
    recentReceivedRequests,
    recentSentRequests,
    getFriendByUid,
    isFriend,
    hasSentRequest,
    hasReceivedRequest,
    // 标签相关computed
    getFriendsByTag,
    getAllTags,
    getTagStats,

    // Actions
    setLoading,
    setSearchResults,
    addFriend,
    removeFriend,
    updateFriend,
    addPendingRequest,
    addSentRequest,
    updateRequestStatus,
    removeRequest,
    setFriends,
    setPendingRequests,
    setSentRequests,
    clearSearchResults,
    reset,
    handleFriendResponse,
    handleRequestSent,
    // 标签相关actions
    updateFriendTag,
    removeFriendTag,
    batchUpdateTags
  }
})