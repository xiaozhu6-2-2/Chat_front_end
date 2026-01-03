/**
 * 搜索服务层
 *
 * 功能：实现搜索相关的 API 调用，包括用户搜索和群聊搜索
 * 使用场景：为上层 store 和 composable 提供数据访问接口
 */

import type { GroupSearchResponse, SearchParams, UserSearchResponse } from '@/types/search'
import { authApi } from './api'

export const searchService = {
  /**
   * 搜索用户
   *
   * 执行流程：
   * 1. 准备请求参数（设置默认值）
   * 2. 调用 /auth/friends/search API
   * 3. 验证响应状态
   * 4. 返回响应数据
   *
   * 数据流：
   * - 输入：搜索参数（关键词、分页信息）
   * - 输出：用户搜索响应（包含分页信息和用户列表）
   * - 副作用：发送 HTTP 请求
   *
   * @param params 搜索参数
   * @returns Promise<UserSearchResponse> 用户搜索结果
   */
  async searchUsers (params: SearchParams): Promise<UserSearchResponse> {
    console.log('searchService: 搜索用户开始', params)

    // 准备请求体，确保所有字段都有值
    const requestBody = {
      query: params.query,
      limit: params.limit ?? 20,
      offset: params.offset ?? 0,
    }

    try {
      const response = await authApi.post('/friends/search', requestBody)

      if (response.status === 200) {
        console.log('searchService: 搜索用户成功', {
          totalItems: response.data.total_items,
          currentPage: response.data.current_page,
        })
        return response.data
      }

      // 如果状态码不是 200，抛出错误
      throw new Error(`搜索用户失败：HTTP ${response.status}`)
    } catch (error) {
      console.error('searchService: 搜索用户失败', error)
      // 不在此层显示 snackbar，让调用层处理
      throw error
    }
  },

  /**
   * 搜索群聊
   *
   * 执行流程：
   * 1. 准备请求参数（设置默认值）
   * 2. 调用 /auth/groups/search API
   * 3. 验证响应状态
   * 4. 返回响应数据
   *
   * 数据流：
   * - 输入：搜索参数（关键词、分页信息）
   * - 输出：群聊搜索响应（包含分页信息和群聊列表）
   * - 副作用：发送 HTTP 请求
   *
   * @param params 搜索参数
   * @returns Promise<GroupSearchResponse> 群聊搜索结果
   */
  async searchGroups (params: SearchParams): Promise<GroupSearchResponse> {
    console.log('searchService: 搜索群聊开始', params)

    // 准备请求体，确保所有字段都有值
    const requestBody = {
      query: params.query,
      limit: params.limit ?? 20,
      offset: params.offset ?? 0,
    }

    try {
      const response = await authApi.post('/groups/search', requestBody)

      if (response.status === 200) {
        console.log('searchService: 搜索群聊成功', {
          totalItems: response.data.total_items,
          currentPage: response.data.current_page,
        })
        return response.data
      }

      // 如果状态码不是 200，抛出错误
      throw new Error(`搜索群聊失败：HTTP ${response.status}`)
    } catch (error) {
      console.error('searchService: 搜索群聊失败', error)
      // 不在此层显示 snackbar，让调用层处理
      throw error
    }
  },
}
