import { computed } from 'vue'
import { useFriendStore } from '@/stores/friendStore'
import { friendService } from '@/service/friendService'
import type { FriendWithUserInfo } from '@/types/friend'
import { useSnackbar } from './useSnackbar'

export function useFriend() {
  const friendStore = useFriendStore()

  const {showSuccess, showError} = useSnackbar();

  //State
  

  // Computed properties
  //获取非黑名单好友列表
  const activeFriends = computed(() => friendStore.activeFriends)
  const isLoading = computed(() => friendStore.isLoading)
  // 获取黑名单列表
  const blacklistedFriends = computed(() => friendStore.blacklistedFriends)

  //删除好友
  const removeFriend = async (friendId: string) => {
    try {
      //通知后端
      await friendService.removeFriend(friendId)
      //前端列表删除
      friendStore.removeFriend(friendId)
      console.log('useFriend: 删除好友')
    } catch (error) {
      console.error('删除好友失败')
    }
  }

  //contactCard渲染时获取好友资料
  const getFriendProfile = async (friendId: string, userId: string): Promise<FriendWithUserInfo> => {
    // 先从store中查找
    const friendInStore = friendStore.getFriendByUid(userId)
    if (friendInStore) {
      return friendInStore
    }

    // 没有则从service获取
    try {
      const friendProfile = await friendService.getFriendProfile(friendId, userId)
      // 写入store
      friendStore.addFriend(friendProfile)
      return friendProfile
    } catch (error) {
      showError('获取好友资料失败')
      console.error('useFriend: 获取好友资料失败')
      return Promise.reject(error)
    }
  }

  //更新好友设置，包括备注、黑名单、标签
  const updateFriendProfile = async (
    friendId: string,
    remark: string,
    isBlacklisted: boolean,
    tag: string
  ) => {
    try{
      //service通知修改
      await friendService.updateFriendProfile(friendId, remark, isBlacklisted, tag)
      //store更新资料
      friendStore.updateFriendProfile(friendId, remark, isBlacklisted, tag)
      showSuccess('更新好友资料成功')
    }catch(err){
      // 错误已经在 service 层处理和显示了
      console.error('useFriend: 更新好友资料失败', err)
      // 重新抛出错误，让调用者可以进一步处理
      throw err
    }
  }
  
  // 检查用户关系的辅助函数
  const checkUserRelation = (uid: string) => {
    return {
      isFriend: friendStore.isFriend(uid)
    }
  }

  // 根据用户ID获取好友信息
  const getFriendByUid = (uid: string) => {
    return friendStore.getFriendByUid(uid)
  }

  // 刷新好友数据，通过API获取新的好友资料并覆盖store中的数据
  const refreshFriendData = async (fid: string, uid: string) => {
    try {
      console.log('useFriend: 开始刷新好友数据', { fid, uid })

      // 1. 从 service 获取最新的好友资料
      const friendProfile = await friendService.getFriendProfile(fid, uid)

      // 2. 写入 store，更新本地状态
      friendStore.addFriend(friendProfile)

      console.log('useFriend: 刷新好友数据成功', { fid, uid })

      return friendProfile
    } catch (error) {
      // HTTP 错误已由拦截器统一处理，这里只记录日志
      console.error('useFriend: 刷新好友数据失败', { fid, uid }, error)
    }
  }

  //获取所有好友分组标签
  const getAllFriendTags = () => {
    console.log('useFriend: 获取所有好友分组标签')
    try {
      const tags = friendStore.getAllTags
      console.log('useFriend: 获取到标签列表', tags.length, '个标签')
      return tags
    } catch (error) {
      console.error('useFriend: 获取标签列表失败', error)
      return []
    }
  }

  //根据分组标签获取好友
  const getFriendsByTag = (tag: string) => {
    console.log('useFriend: 根据标签获取好友', { tag })
    try {
      const friends = friendStore.getFriendsByTag(tag)
      console.log('useFriend: 获取到', friends.length, '个好友，标签:', tag)
      return friends
    } catch (error) {
      console.error('useFriend: 根据标签获取好友失败', { tag }, error)
      return []
    }
  }



  return {
    // State
    activeFriends,
    blacklistedFriends,
    isLoading,

    // Actions
    removeFriend,
    updateFriendProfile,
    checkUserRelation,
    getFriendByUid,
    getFriendProfile,
    refreshFriendData,

    // 标签管理函数
    getAllFriendTags,
    getFriendsByTag,
  }
}