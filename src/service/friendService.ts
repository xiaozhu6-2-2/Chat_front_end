/**
 * 好友服务层 - 处理好友关系管理
 * 负责好友相关的CRUD操作，不包括实时通知功能
 */

import type { FriendUpdateOptions, FriendWithUserInfo } from '@/types/friend'
import { useSnackbar } from '@/composables/useSnackbar'
import { FriendApiToFriendWithUserInfo } from '@/types/friend'
import { authApi } from './api'
const { showError } = useSnackbar()

export const friendService = {
  /**
   * 获取好友列表
   * @returns 合并的好友列表（包括普通好友和黑名单用户）
   */
  async getFriendsFromApi (): Promise<FriendWithUserInfo[]> {
    try {
      const response = await authApi.get('/friends/friendlist')

      // 处理响应
      if (response.status === 200) {
        return this.transformFriendsResponse(response.data)
      } else {
        throw new Error(`获取好友列表失败：${response.status}`)
      }
    } catch (error) {
      // 错误处理
      showError('获取好友列表失败')
      throw error
    }
  },

  // 将response转为合并的好友列表
  transformFriendsResponse (apiResponse: {
    friends: any[]
    blacklist: any[]
  }): FriendWithUserInfo[] {
    // 处理普通好友（已排除黑名单）
    const friends = apiResponse.friends.map(friend => ({
      fid: friend.fid,
      // BaseProfile 字段
      id: friend.uid,
      name: friend.username,
      avatar: friend.avatar || '',
      // FriendWithUserInfo 特有字段
      remark: friend.remark || friend.username,
      bio: friend.bio || '',
      tag: friend.groupBy || friend.group_by || 'default',
      isBlacklisted: false, // friends 列表中的都是非黑名单用户
      createdAt: friend.createdAt || friend.created_at || new Date().toISOString(),
    }))

    // 处理黑名单用户
    const blacklist = apiResponse.blacklist.map(friend => ({
      fid: friend.fid,
      // BaseProfile 字段
      id: friend.uid,
      name: friend.username,
      avatar: friend.avatar || '',
      // FriendWithUserInfo 特有字段
      remark: friend.remark || friend.username,
      bio: friend.bio || '',
      tag: friend.groupBy || friend.group_by || 'default',
      isBlacklisted: true, // 黑名单用户
      createdAt: friend.createdAt || friend.created_at || new Date().toISOString(),
    }))

    // 合并所有好友（包括黑名单）
    return [...friends, ...blacklist]
  },

  /**
   * 删除好友
   * @param friendId 好友ID
   */
  async removeFriend (friendId: string): Promise<void> {
    try {
      const response = await authApi.post('/friends/remove', {
        fid: friendId,
      })

      if (response.status != 200) {
        console.error('friendService: 删除好友失败')
      }
    } catch (error) {
      console.error('删除好友失败:', error)
    }
  },

  async getFriendProfile (friendId: string, userId: string): Promise<FriendWithUserInfo> {
    const response = await authApi.post('/friends/profile', {
      uid: userId,
      fid: friendId,
    })
    if (response.status === 200) {
      const apiData = response.data
      return FriendApiToFriendWithUserInfo(apiData)
    } else {
      console.error('useFriend: 获取好友资料失败')
      throw undefined
    }
  },

  /**
   * 更新好友资料（备注、黑名单状态、分组）
   * @param friendId 好友ID
   * @param options 更新选项对象
   * @returns Promise<void>
   */
  async updateFriendProfile (
    friendId: string,
    options: FriendUpdateOptions,
  ): Promise<void> {
    try {
      // 检查是否至少传入了一个更新项
      if (!options || (options.remark === undefined
        && options.isBlacklisted === undefined
        && options.tag === undefined)) {
        console.warn('更新好友资料必须要有一项更改')
        throw new Error('更新好友资料必须要有一项更改')
      }

      // 从 options 中解构参数
      const { remark, isBlacklisted, tag } = options

      const response = await authApi.post('/friends/update', {
        fid: friendId,
        remark: remark ?? null,
        is_blacklisted: isBlacklisted ?? null,
        group_by: tag ?? null,
      })

      if (response.status === 200) {
        return
      }
    } catch (error) {
      console.error('Service更新好友资料失败:', error)
      return Promise.reject(error)
    }
  },

}
