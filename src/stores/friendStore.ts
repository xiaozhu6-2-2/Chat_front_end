// stores/friendStore.ts
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type {
  UserProfile,
  UserSearchResult,
  FriendWithUserInfo,
  FriendRequest
} from '@/service/messageTypes'

export const useFriendStore = defineStore('friend', () => {
  // State
  const friends = ref<Map<string, FriendWithUserInfo>>(new Map())  // fid -> friend info
  const pendingRequests = ref<Map<string, FriendRequest>>(new Map()) // req_id -> request (我收到的请求)
  const sentRequests = ref<Map<string, FriendRequest>>(new Map())   // req_id -> request (我发送的请求)
  const searchResults = ref<UserSearchResult[]>([])
  const isLoading = ref(false)

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
    handleRequestSent
  }
})