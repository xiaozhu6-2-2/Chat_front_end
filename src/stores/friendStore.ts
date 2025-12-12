// stores/friendStore.ts
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type {
<<<<<<< HEAD
  UserProfile,
  UserSearchResult,
  FriendWithUserInfo,
  FriendRequest
} from '@/service/messageTypes'
import { devLog, isDevelopment } from '@/utils/env'
=======
  FriendWithUserInfo
} from '@/types/friend'
import { friendService } from '@/service/friendService'
>>>>>>> 767ef992417a363317cf0ccd1f091690b2379ed4

export const useFriendStore = defineStore('friend', () => {
  // State
  const friends = ref<Map<string, FriendWithUserInfo>>(new Map())  // fid -> friend info (包括所有好友，黑名单通过isBlacklisted字段区分)
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
  //从好友列表中筛选非黑名单好友
  const activeFriends = computed(() => {
    return Array.from(friends.value.values())
      .filter(friend => !friend.isBlacklisted)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  })

  
  //根据uid查找好友关系及好友信息
  const getFriendByUid = computed(() => {
    return (uid: string) => {
      return Array.from(friends.value.values())
        .find(friend => friend.uid === uid)
    }
  })

  const isFriend = computed(() => {
    return (uid: string) => {
      return Array.from(friends.value.values())
        .some(friend => friend.uid === uid && !friend.isBlacklisted)
    }
  })

  
  // 标签相关计算属性
  const getFriendsByTag = computed(() => {
    return (tag: string) => {
      return Array.from(friends.value.values())
        .filter(friend => friend.tag === tag && !friend.isBlacklisted)
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

  
  const setFriends = (friendList: FriendWithUserInfo[]) => {
    // 清空并设置所有好友（包括黑名单）
    friends.value.clear()
    friendList.forEach(friend => {
      friends.value.set(friend.fid, friend)
    })
  }

  
  const reset = () => {
    friends.value.clear()
    isLoading.value = false
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

  /**
   * 更新好友资料（备注、黑名单状态、分组）
   * @param friendId 好友ID
   * @param remark 备注
   * @param isBlacklisted 是否加入黑名单
   * @param tag 分组标签
   */
  const updateFriendProfile = (
    friendId: string,
    remark: string,
    isBlacklisted: boolean,
    tag: string
  ) => {
    const friend = friends.value.get(friendId)
    if (friend) {
      // 使用现有的 updateFriend 方法更新
      updateFriend(friendId, {
        remark,
        isBlacklisted,
        tag
      })
    }
  }

  /**
   * 从 API 获取好友列表并更新 store
   * @param forceRefresh 是否强制刷新（即使已有数据）
   */
  const fetchFriends = async (forceRefresh = false) => {
    // 如果已经有数据且不是强制刷新，可以跳过
    if (!forceRefresh && friends.value.size > 0) {
      return
    }

    setLoading(true)
    try {
      const friendList = await friendService.getFriendsFromApi()
      const activeCount = friendList.filter(f => !f.isBlacklisted).length
      const blacklistedCount = friendList.filter(f => f.isBlacklisted).length
      console.log(`friendStore: 获取好友列表: ${activeCount} 个好友, ${blacklistedCount} 个黑名单`)
      setFriends(friendList)
    } catch (error) {
      console.error('friendStore: 获取好友列表失败')
      throw error // 重新抛出让上层处理
    } finally {
      setLoading(false)
    }
  }

  // 获取黑名单列表
  const blacklistedFriends = computed(() => {
    return Array.from(friends.value.values())
      .filter(friend => friend.isBlacklisted)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  })

  return {
    // State
    friends,
    isLoading,

    // Computed
    activeFriends,
    blacklistedFriends,
    getFriendByUid,
    isFriend,
    // 标签相关computed
    getFriendsByTag,
    getAllTags,
    getTagStats,

    // Actions
    setLoading,
    addFriend,
    removeFriend,
    updateFriend,
    updateFriendProfile,
    setFriends,
    reset,
    // 标签相关actions
    updateFriendTag,
    removeFriendTag,
    batchUpdateTags,
    fetchFriends
  }
})