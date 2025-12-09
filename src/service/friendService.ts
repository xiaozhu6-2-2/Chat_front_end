/**
 * 好友服务层 - 处理好友关系管理
 * 负责好友相关的CRUD操作，不包括实时通知功能
 */

import { envConfig, devLog, isDevelopment } from '@/utils/env';
import { mockDataService } from './mockDataService';
import type { UserSearchResult, FriendWithUserInfo, FriendRequest } from './messageTypes';

class FriendService {
  private token: string | undefined = undefined;
  private userId: string | undefined = undefined;

  constructor() {
    // 初始化开发环境配置
    if (isDevelopment()) {
      this.initDevelopmentMode();
    }
  }

  /**
   * 开发环境初始化
   */
  private initDevelopmentMode(): void {
    devLog('Initializing FriendService in development mode');
    this.userId = envConfig.mockUserId;
    this.token = envConfig.mockUserToken;
  }

  /**
   * 初始化服务
   */
  init(token: string, userId: string): void {
    this.token = token;
    this.userId = userId;
    devLog('FriendService initialized successfully', { userId: this.userId });
  }

  /**
   * 判断是否使用模拟数据
   */
  private shouldUseMockData(): boolean {
    return isDevelopment() && envConfig.useMockData
  }

  /**
   * 搜索用户
   * @param query 搜索关键词
   * @returns 搜索结果
   */
  async searchUsers(query: string): Promise<UserSearchResult[]> {
    if (!this.token) {
      console.error('token为空，无法搜索用户');
      throw new Error('未登录');
    }

    try {
      // 开发环境使用模拟数据
      if (this.shouldUseMockData()) {
        devLog('Searching users with mock data', { query });
        return await mockDataService.mockSearchUsers(query);
      }

      // TODO: 生产环境调用真实 API
      const response = await authApi.post('/auth/friends/search', {
        query,
        limit: 20,
        offset: 0
      });
      if (response.status === 200) {
        return response.data.users;
      } else {
        throw new Error(`搜索用户失败：${response.status}`);
      }

      throw new Error('生产环境用户搜索 API 尚未实现');

    } catch (error) {
      console.error('搜索用户失败:', error);
      throw error;
    }
  }

  /**
   * 创建好友请求（仅创建请求，不发送通知）
   * @param receiver_uid 接收者用户ID
   * @param apply_text 申请文本
   * @returns 好友请求数据
   */
  async createFriendRequest(receiver_uid: string, apply_text?: string, tags?: string[]): Promise<FriendRequest> {
    if (!this.token) {
      console.error('token为空，无法创建好友请求');
      throw new Error('未登录');
    }

    try {
      // 开发环境使用模拟数据
      if (this.shouldUseMockData()) {
        devLog('Creating friend request with mock data', { receiver_uid, apply_text, tags });
        return await mockDataService.mockSendFriendRequest(receiver_uid, apply_text, tags);
      }

      // TODO: 生产环境调用真实 API
      // const response = await authApi.post('/auth/friend/request', {
      //   receiver_uid,
      //   apply_text,
      //   tags
      // });
      // if (response.status === 200) {
      //   return response.data.request;
      // } else {
      //   throw new Error(`创建好友请求失败：${response.status}`);
      // }

      throw new Error('生产环境创建好友请求 API 尚未实现');

    } catch (error) {
      console.error('创建好友请求失败:', error);
      throw error;
    }
  }

  /**
   * 响应好友请求（仅处理响应逻辑，不发送通知）
   * @param req_id 请求ID
   * @param status 响应状态
   */
  async respondToFriendRequest(req_id: string, status: 'accepted' | 'rejected'): Promise<void> {
    if (!this.token) {
      console.error('token为空，无法响应好友请求');
      throw new Error('未登录');
    }

    try {
      // 开发环境使用模拟数据
      if (this.shouldUseMockData()) {
        devLog('Responding to friend request with mock data', { req_id, status });
        await mockDataService.mockRespondToRequest(req_id, status);
        return;
      }

      // TODO: 生产环境调用真实 API
      // await authApi.post('/auth/friend/respond', {
      //   req_id,
      //   status
      // });

      throw new Error('生产环境响应好友请求 API 尚未实现');

    } catch (error) {
      console.error('响应好友请求失败:', error);
      throw error;
    }
  }

  /**
   * 获取好友列表
   * @returns 好友列表
   */
  async getFriends(): Promise<FriendWithUserInfo[]> {
    if (!this.token) {
      console.error('token为空，无法获取好友列表');
      throw new Error('未登录');
    }

    try {
      // 开发环境使用模拟数据
      if (this.shouldUseMockData()) {
        devLog('Getting friends with mock data');
        return await mockDataService.mockGetFriends();
      }

      // TODO: 生产环境调用真实 API
      // const response = await authApi.get('/auth/friends/list');
      // if (response.status === 200) {
      //   return response.data.friends;
      // } else {
      //   throw new Error(`获取好友列表失败：${response.status}`);
      // }

      throw new Error('生产环境获取好友列表 API 尚未实现');

    } catch (error) {
      console.error('获取好友列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取待处理的好友请求
   * @returns 请求列表
   */
  async getPendingRequests(): Promise<{
    receivedRequests: FriendRequest[]
    sentRequests: FriendRequest[]
  }> {
    if (!this.token) {
      console.error('token为空，无法获取好友请求');
      throw new Error('未登录');
    }

    try {
      // 开发环境使用模拟数据
      if (this.shouldUseMockData()) {
        devLog('Getting pending requests with mock data');
        return await mockDataService.mockGetPendingRequests();
      }

      // TODO: 生产环境调用真实 API
      // const response = await authApi.get('/auth/friend/requests/pending');
      // if (response.status === 200) {
      //   return {
      //     receivedRequests: response.data.receivedRequests,
      //     sentRequests: response.data.sentRequests
      //   };
      // } else {
      //   throw new Error(`获取好友请求失败：${response.status}`);
      // }

      throw new Error('生产环境获取好友请求 API 尚未实现');

    } catch (error) {
      console.error('获取好友请求失败:', error);
      throw error;
    }
  }

  /**
   * 删除好友
   * @param friendId 好友ID
   */
  async removeFriend(friendId: string): Promise<void> {
    if (!this.token) {
      console.error('token为空，无法删除好友');
      throw new Error('未登录');
    }

    try {
      // 开发环境使用模拟数据
      if (this.shouldUseMockData()) {
        devLog('Removing friend with mock data', { friendId });
        await mockDataService.mockRemoveFriend(friendId);
        return;
      }

      // TODO: 生产环境调用真实 API
      // await authApi.delete(`/auth/friends/${friendId}`);

      throw new Error('生产环境删除好友 API 尚未实现');

    } catch (error) {
      console.error('删除好友失败:', error);
      throw error;
    }
  }

  /**
   * 更新好友备注
   * @param friendId 好友ID
   * @param remark 备注内容
   */
  async updateFriendRemark(friendId: string, remark: string): Promise<void> {
    if (!this.token) {
      console.error('token为空，无法更新好友备注');
      throw new Error('未登录');
    }

    try {
      // 开发环境使用模拟数据
      if (this.shouldUseMockData()) {
        devLog('Updating friend remark with mock data', { friendId, remark });
        await mockDataService.mockUpdateFriendRemark(friendId, remark);
        return;
      }

      // TODO: 生产环境调用真实 API
      // await authApi.put(`/auth/friends/${friendId}/remark`, { remark });

      throw new Error('生产环境更新好友备注 API 尚未实现');

    } catch (error) {
      console.error('更新好友备注失败:', error);
      throw error;
    }
  }

  /**
   * 设置好友黑名单状态
   * @param friendId 好友ID
   * @param is_blacklist 是否黑名单
   */
  async setFriendBlacklist(friendId: string, is_blacklist: boolean): Promise<void> {
    if (!this.token) {
      console.error('token为空，无法设置好友黑名单');
      throw new Error('未登录');
    }

    try {
      // 开发环境使用模拟数据
      if (this.shouldUseMockData()) {
        devLog('Setting friend blacklist with mock data', { friendId, is_blacklist });
        await mockDataService.mockSetFriendBlacklist(friendId, is_blacklist);
        return;
      }

      // TODO: 生产环境调用真实 API
      // await authApi.put(`/auth/friends/${friendId}/blacklist`, { is_blacklist });

      throw new Error('生产环境设置好友黑名单 API 尚未实现');

    } catch (error) {
      console.error('设置好友黑名单失败:', error);
      throw error;
    }
  }
}

export const friendService = new FriendService();