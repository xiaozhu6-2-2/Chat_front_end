/**
 * 好友请求服务层 - 纯数据访问层
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

import type {
  FriendRequest,
  FriendRequestListResponse,
} from '@/types/friendRequest'
import { authApi } from './api'

export const friendRequestService = {
  /**
   * 发送好友请求
   *
   * 执行流程：
   * 1. 调用 /friends/request API
   * 2. 验证响应状态
   * 3. 返回响应数据
   *
   * @param {string} receiver_id 接收者ID
   * @param {string} message 请求消息
   * @returns Promise<any> API响应数据
   * @throws Error 发送失败时抛出错误
   */
  async sendFriendRequest (receiver_id: string, message: string) {
    console.log('friendRequestService: 发送好友请求', { receiver_id, message })
    try {
      const response = await authApi.post('/friends/request', {
        receiver_id,
        message,
      })
      if (response.status === 200) {
        console.log('friendRequestService: 发送好友请求成功', response.data)
        return response.data
      } else {
        throw new Error(`发送好友请求失败：HTTP ${response.status}`)
      }
    } catch (error) {
      console.error('friendRequestService.sendFriendRequest:', error)
      throw error
    }
  },

  /**
   * 响应好友请求
   *
   * 执行流程：
   * 1. 调用 /friends/respond API
   * 2. 验证响应状态
   * 3. 返回响应数据
   *
   * @param {string} req_id 请求ID
   * @param {'accept' | 'reject'} action 响应动作
   * @returns Promise<any> API响应数据
   * @throws Error 响应失败时抛出错误
   */
  async respondFriendRequest (req_id: string, action: 'accept' | 'reject') {
    console.log('friendRequestService: 响应好友请求', { req_id, action })
    try {
      const response = await authApi.post('/friends/respond', {
        req_id,
        action,
      })
      if (response.status === 200) {
        console.log('friendRequestService: 响应好友请求成功', response.data)
        return response.data
      } else {
        throw new Error(`响应好友请求失败：HTTP ${response.status}`)
      }
    } catch (error) {
      console.error('friendRequestService.respondFriendRequest:', error)
      throw error
    }
  },

  /**
   * 获取好友请求列表
   *
   * 执行流程：
   * 1. 调用 /friends/request_list API
   * 2. 验证响应状态
   * 3. 返回响应数据
   *
   * @returns Promise<FriendRequestListResponse> 好友请求列表响应
   * @throws Error 获取失败时抛出错误
   */
  async getFriendRequestList (): Promise<FriendRequestListResponse> {
    console.log('friendRequestService: 获取好友请求列表')
    try {
      const response = await authApi.get('/friends/request_list')
      if (response.status === 200) {
        console.log('friendRequestService: 获取好友请求列表成功', response.data)
        return response.data
      } else {
        throw new Error(`获取好友请求列表失败：HTTP ${response.status}`)
      }
    } catch (error) {
      console.error('friendRequestService.getFriendRequestList:', error)
      throw error
    }
  },
}
