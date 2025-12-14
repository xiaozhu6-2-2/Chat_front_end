/**
 * 好友服务层 - 处理好友关系管理
 * 负责好友相关的CRUD操作，不包括实时通知功能
 */

import type { FriendWithUserInfo, UpdateFriendProfileParams, FriendProfileUpdateOptions } from '@/types/friend';
import { FriendApiToFriendWithUserInfo } from '@/types/friend';
import { authApi } from './api';
import { useSnackbar } from '@/composables/useSnackbar';
const {showError} = useSnackbar();

export const friendService = {
  /**
   * 获取好友列表
   * @returns 合并的好友列表（包括普通好友和黑名单用户）
   */
  async getFriendsFromApi(): Promise<FriendWithUserInfo[]> {
    try {
      const response = await authApi.get('/friends/friendlist');

      // 处理响应
      if (response.status === 200) {
        return this.transformFriendsResponse(response.data);
      } else {
        throw new Error(`获取好友列表失败：${response.status}`);
      }
    } catch (error) {
      // 错误处理
      showError('获取好友列表失败')
      throw error;
    }
  },

  //将response转为合并的好友列表
  transformFriendsResponse(apiResponse: {
    friends: any[];
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
    }));

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
    }));

    // 合并所有好友（包括黑名单）
    return [...friends, ...blacklist];
  },

  /**
   * 删除好友
   * @param friendId 好友ID
   */
  async removeFriend(friendId: string): Promise<void> {
    try {
      const response = await authApi.post('/friends/remove', {
        "fid": friendId
      })

      if(response.status != 200){
        console.error("friendService: 删除好友失败")
      }

    } catch (error) {
      console.error('删除好友失败:', error);
    }
  },

  async getFriendProfile(friendId:string, userId:string): Promise<FriendWithUserInfo>{
    const response = await authApi.post('/friends/profile', {
      "uid": userId,
      "fid": friendId
    })
    if(response.status === 200){
      const apiData = response.data
      return FriendApiToFriendWithUserInfo(apiData)
    }else{
      console.error("useFriend: 获取好友资料失败")
      return Promise.reject();
    }
  },

  /**
   * 更新好友资料
   * @param friendId 好友ID
   * @param remark 备注
   * @param isBlacklisted 是否加入黑名单
   * @param tag 分组标签
   * @returns Promise<void>
   */
  async updateFriendProfile(
    friendId: string,
    remark: string,
    isBlacklisted: boolean,
    tag: string
  ): Promise<void> {
    try {
      const updateFriendProfileParams: UpdateFriendProfileParams = {
        fid: friendId,
        remark: remark,
        is_blacklisted: isBlacklisted,
        group_by: tag
      };

      const response = await authApi.post('/friends/update', updateFriendProfileParams);

      if(response.status === 200) {
        return Promise.resolve();
      }
    } catch (error) {
      console.error('Service更新好友资料失败:', error);
      return Promise.reject(error);
    }
  },

  /**
   * 部分更新好友资料
   * @param friendId 好友ID
   * @param options 更新选项（可选字段）
   * @returns Promise<void>
   */
  async updateFriendProfilePartial(
    friendId: string,
    options: FriendProfileUpdateOptions
  ): Promise<void> {
    try {
      // 验证至少有一个字段要更新
      if (options.remark === undefined &&
          options.isBlacklisted === undefined &&
          options.tag === undefined) {
        throw new Error('至少需要提供一个要更新的字段');
      }

      // 获取当前好友资料
      const currentProfile = await this.getFriendProfile(friendId);

      // 合并新旧值，未提供的字段使用当前值
      const mergedRemark = options.remark ?? currentProfile.remark ?? '';
      const mergedIsBlacklisted = options.isBlacklisted ?? currentProfile.isBlacklisted;
      const mergedTag = options.tag ?? currentProfile.tag ?? '';

      // 使用现有的完整更新方法
      return await this.updateFriendProfile(friendId, mergedRemark, mergedIsBlacklisted, mergedTag);
    } catch (error) {
      console.error('Service部分更新好友资料失败:', error);
      return Promise.reject(error);
    }
  }


}
