import type {
  FriendUpdateOptions,
  FriendWithUserInfo,
} from '@/types/friend'
import { defineStore } from 'pinia'
// stores/friendStore.ts
import { computed, ref } from 'vue'

export const useFriendStore = defineStore('friend', () => {
  // State
  const friends = ref<Map<string, FriendWithUserInfo>>(new Map()) // fid -> friend info (包括所有好友，黑名单通过isBlacklisted字段区分)
  const isLoading = ref(false)

  // Computed
  // 从好友列表中筛选非黑名单好友
  const activeFriends = computed(() => {
    return Array.from(friends.value.values())
      .filter(friend => !friend.isBlacklisted)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  })

  // 根据uid查找好友关系及好友信息
  const getFriendByUid = computed(() => {
    return (uid: string) => {
      return Array.from(friends.value.values())
        .find(friend => friend.id === uid) // 使用 id 而非 uid
    }
  })

  // 根据fid查找好友（fid是Map的key）
  const getFriendByFid = computed(() => {
    return (fid: string) => {
      return friends.value.get(fid)
    }
  })

  const isFriend = computed(() => {
    return (uid: string) => {
      return Array.from(friends.value.values())
        .some(friend => friend.id === uid) // 使用 id 而非 uid，不排除黑名单
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
    for (const friend of Array.from(friends.value.values())) {
      if (friend.tag) {
        tags.add(friend.tag)
      }
    }
    return Array.from(tags).sort()
  })

  const getTagStats = computed(() => {
    const stats: Record<string, number> = {}
    for (const friend of Array.from(friends.value.values())) {
      if (friend.tag) {
        stats[friend.tag] = (stats[friend.tag] || 0) + 1
      }
    }
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
    for (const friend of friendList) {
      friends.value.set(friend.fid, friend)
    }
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
    for (const { friendId, tag } of updates) {
      updateFriendTag(friendId, tag)
    }
  }

  /**
   * 更新好友资料（备注、黑名单状态、分组）
   * @param friendId 好友ID
   * @param options 更新选项对象
   */
  const updateFriendProfile = (
    friendId: string,
    options: FriendUpdateOptions,
  ) => {
    const friend = friends.value.get(friendId)
    if (friend) {
      // 使用现有的 updateFriend 方法更新
      updateFriend(friendId, options)
    }
  }

  /**
   * 从API响应设置好友列表
   *
   * 执行流程：
   * 1. 接收好友列表数据
   * 2. 统计活跃好友和黑名单数量
   * 3. 更新store状态
   * 4. 记录日志
   *
   * 数据流：
   * - 输入：好友列表数组
   * - 输出：更新store中的friends状态
   *
   * @param {FriendWithUserInfo[]} friendList 从API获取的好友列表
   */
  const setFriendsFromApi = (friendList: FriendWithUserInfo[]) => {
    const activeCount = friendList.filter(f => !f.isBlacklisted).length
    const blacklistedCount = friendList.filter(f => f.isBlacklisted).length
    console.log(`friendStore: 设置好友列表: ${activeCount} 个好友, ${blacklistedCount} 个黑名单`)
    setFriends(friendList)
  }

  /**
   * 批量更新好友在线状态
   * @param onlineUserIds 在线用户ID列表
   */
  const batchUpdateOnlineState = (onlineUserIds: string[]) => {
    const onlineSet = new Set(onlineUserIds)

    for (const [fid, friend] of friends.value) {
      const isOnline = onlineSet.has(friend.id)
      // 只有状态变化时才更新
      if (friend.online_state !== isOnline) {
        friend.online_state = isOnline
      }
    }

    console.log(`friendStore: 更新在线状态，${onlineUserIds.length} 个在线`)
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
    getFriendByFid,
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
    setFriendsFromApi, // 新增：从API响应设置好友列表
    batchUpdateOnlineState, // 新增：批量更新在线状态
    reset,
    // 标签相关actions
    updateFriendTag,
    removeFriendTag,
    batchUpdateTags,
    // 移除 fetchFriends
  }
})
