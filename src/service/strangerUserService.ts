/**
 * 陌生人用户服务层
 *
 * 职责：
 * - 处理非好友用户信息的获取
 * - 用于好友请求列表、群聊申请列表等场景中展示申请人信息
 *
 * 使用场景：
 * - 好友请求列表中显示申请者信息
 * - 群聊申请列表中显示申请人信息
 * - 搜索结果中显示非好友用户信息
 *
 * 数据流：
 * - 输入：用户ID
 * - 输出：用户基本信息（uid, username, avatar等）
 * - 副作用：发送HTTP请求
 */

import { authApi } from './api'

// ==================== 类型定义 ====================

/**
 * 获取非好友用户资料请求参数
 */
export interface GetStrangerUserProfileParams {
  uid: string // 用户ID
}

/**
 * 获取非好友用户资料响应
 */
export interface StrangerUserProfile {
  uid: string // 用户ID
  account: string // 账号
  username: string // 用户名
  gender?: string | null // 性别: male/female/other
  region?: string | null // 地区
  email?: string | null // 邮箱
  avatar?: string | null // 头像URL
  bio?: string | null // 个人简介
}

/**
 * API响应类型
 */
export type StrangerUserProfileResponse = StrangerUserProfile

// ==================== 服务定义 ====================

export const strangerUserService = {
  /**
   * 获取非好友用户资料
   *
   * 执行流程：
   * 1. 调用 /auth/user/profile API
   * 2. 验证响应状态
   * 3. 返回用户资料数据
   *
   * 使用场景：
   * - 用户查看好友请求列表中的申请者信息
   * - 用户查看群聊申请列表中的申请人信息
   * - 用户通过搜索查看非好友用户资料
   * - 任何需要展示非好友用户信息的场景
   *
   * @param {string} uid - 用户ID
   * @returns Promise<StrangerUserProfile> 用户资料
   * @throws Error 获取失败时抛出错误
   *
   * @example
   * ```typescript
   * try {
   *   const profile = await strangerUserService.getUserProfile('user123');
   *   console.log('用户名:', profile.username);
   * } catch (error) {
   *   console.error('获取用户资料失败:', error);
   * }
   * ```
   */
  async getUserProfile (uid: string): Promise<StrangerUserProfile> {
    console.log('strangerUserService: 获取非好友用户资料', uid)
    try {
      const response = await authApi.post<StrangerUserProfileResponse>('/user/profile', {
        uid,
      })

      if (response.status === 200) {
        console.log('strangerUserService: 获取用户资料成功', response.data)
        return response.data
      } else {
        throw new Error(`获取用户资料失败：HTTP ${response.status}`)
      }
    } catch (error) {
      console.error('strangerUserService.getUserProfile:', error)
      throw error
    }
  },
}
