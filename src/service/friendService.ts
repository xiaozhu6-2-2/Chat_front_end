/**
 * 好友服务层 - 纯数据访问层
 *
 * 职责：
 * - 负责API调用
 * - 数据转换
 * - 错误抛出（不处理UI）
 *
 * 数据流：
 * - 输入：请求参数
 * - 输出：转换后的数据或错误
 * - 副作用：发送HTTP请求
 */

import type { FriendUpdateOptions, FriendWithUserInfo } from '@/types/friend'
import { FriendApiToFriendWithUserInfo } from '@/types/friend'
import { authApi } from './api'

export const friendService = {
  /**
   * 获取好友列表
   *
   * 执行流程：
   * 1. 调用 /friends/friendlist API
   * 2. 验证响应格式
   * 3. 转换数据格式
   * 4. 返回转换后的数据
   *
   * @returns Promise<FriendWithUserInfo[]> 好友列表（包括普通好友和黑名单用户）
   * @throws Error API错误或数据格式错误
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
      console.error('friendService.getFriendsFromApi:', error)
      throw error // 重新抛出，让上层处理
    }
  },

  // 将response转为合并的好友列表
  transformFriendsResponse (apiResponse: {
    friends: any[]
    blacklist: any[]
  }): FriendWithUserInfo[] {
    // 处理普通好友（已排除黑名单）
    const friends = apiResponse.friends.map(friend => {
      const userInfo = {
        account: friend.account,
        gender: friend.gender,
        region: friend.region,
        email: friend.email,
      }

      return {
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
        info: userInfo, // 添加 info 对象
      }
    })

    // 处理黑名单用户
    const blacklist = apiResponse.blacklist.map(friend => {
      const userInfo = {
        account: friend.account,
        gender: friend.gender,
        region: friend.region,
        email: friend.email,
      }

      return {
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
        info: userInfo, // 添加 info 对象
      }
    })

    // 合并所有好友（包括黑名单）
    return [...friends, ...blacklist]
  },

  /**
   * 删除好友
   *
   * 执行流程：
   * 1. 调用 /friends/remove API
   * 2. 验证响应状态
   * 3. 处理错误
   *
   * @param {string} friendId 好友ID
   * @returns Promise<void>
   * @throws Error 删除失败时抛出错误
   */
  async removeFriend (friendId: string): Promise<void> {
    try {
      const response = await authApi.post('/friends/remove', {
        fid: friendId,
      })

      if (response.status !== 200) {
        throw new Error(`删除好友失败：HTTP ${response.status}`)
      }

      console.log(`friendService: 成功删除好友 ${friendId}`)
    } catch (error) {
      console.error('friendService.removeFriend:', error)
      throw error
    }
  },

  /**
   * 获取好友资料
   *
   * 执行流程：
   * 1. 调用 /friends/profile API
   * 2. 验证响应状态
   * 3. 转换数据格式
   * 4. 返回好友信息
   *
   * @param {string} friendId 好友ID
   * @param {string} userId 用户ID
   * @returns Promise<FriendWithUserInfo> 好友资料信息
   * @throws Error 获取失败时抛出错误
   */
  async getFriendProfile (friendId: string, userId: string): Promise<FriendWithUserInfo> {
    try {
      const response = await authApi.post('/friends/profile', {
        uid: userId,
        fid: friendId,
      })

      if (response.status === 200) {
        const apiData = response.data
        return FriendApiToFriendWithUserInfo(apiData)
      } else {
        throw new Error(`获取好友资料失败：HTTP ${response.status}`)
      }
    } catch (error) {
      console.error('friendService.getFriendProfile:', error)
      throw error
    }
  },

  /**
   * 更新好友资料（备注、黑名单状态、分组）
   *
   * 执行流程：
   * 1. 验证更新参数
   * 2. 调用 /friends/update API
   * 3. 验证响应状态
   * 4. 处理错误
   *
   * @param {string} friendId 好友ID
   * @param {FriendUpdateOptions} options 更新选项对象
   * @returns Promise<void>
   * @throws Error 更新失败时抛出错误
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
        console.warn('friendService: 更新好友资料必须要有一项更改')
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
        console.log(`friendService: 成功更新好友 ${friendId} 资料`)
        return
      } else {
        throw new Error(`更新好友资料失败：HTTP ${response.status}`)
      }
    } catch (error) {
      console.error('friendService.updateFriendProfile:', error)
      throw error
    }
  },

  /**
   * 获取好友列表在线状态
   *
   * 执行流程：
   * 1. 调用 /auth/online/friends-online API
   * 2. 返回在线用户ID列表
   *
   * @returns Promise<string[]> 在线用户ID列表
   */
  async getFriendsOnlineStatus (): Promise<string[]> {
    try {
      const response = await authApi.get('/online/friends-online')

      if (response.status === 200) {
        // 提取在线用户的 user_id 列表
        const onlineFriends = response.data.online_friends || []
        return onlineFriends.map((f: any) => f.user_id)
      } else {
        throw new Error(`获取好友在线状态失败：${response.status}`)
      }
    } catch (error) {
      console.error('friendService.getFriendsOnlineStatus:', error)
      throw error
    }
  },

}
