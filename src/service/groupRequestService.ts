/**
 * 群聊申请服务层
 *
 * 职责：
 * - 封装群聊申请相关的 API 调用
 * - 处理请求参数和响应数据
 * - 错误处理和日志记录
 *
 * 设计原则：
 * - 不在此层添加 snackbar（由 composable 层处理）
 * - 使用 authApi 自动携带 Authorization Bearer token
 * - 所有请求体字段必须包含，undefined 设置为 null
 *
 * @author echat
 * @since 2025-12-16
 */

import type {
  GroupApprovalListResponse,
  RespondGroupRequestParams,
  RespondGroupRequestResponse,
  SendGroupRequestParams,
  SendGroupRequestResponse,
  UserGroupRequestListResponse,
} from '@/types/groupRequest'
import { authApi } from './api'

export const groupRequestService = {
  /**
   * 发送加入群聊申请
   *
   * 执行流程：
   * 1. 构建请求参数，确保所有字段都存在
   * 2. 调用 API 发送申请
   * 3. 检查响应状态并返回数据
   *
   * 数据流：
   * - 输入：群聊ID、申请信息
   * - 输出：申请ID、状态等信息
   * - 副作用：在群聊中创建待处理的申请记录
   *
   * 使用场景：
   * - 用户申请加入私有群聊
   * - 用户被邀请后确认加入
   *
   * API 32 - 发送加入群聊申请
   *
   * @param {string} gid - 群聊ID
   * @param {string} apply_text - 申请信息
   * @returns {Promise<SendGroupRequestResponse>} 申请创建成功的响应数据
   * @throws {Error} 当API调用失败时抛出错误
   */
  async sendGroupRequest (gid: string, apply_text: string): Promise<SendGroupRequestResponse> {
    console.log('groupRequestService: 开始发送群聊申请', { gid, apply_text })

    try {
      // 构建请求参数，确保所有字段都存在
      const params: SendGroupRequestParams = {
        gid,
        apply_text: apply_text || null, // undefined 转为 null
      }

      // 调用 API
      const response = await authApi.post('/groups/send_group_request', params)

      // 检查响应状态
      if (response.status === 200 && response.data) {
        console.log('groupRequestService: 发送群聊申请成功', response.data)
        return response.data
      } else {
        throw new Error('发送群聊申请失败：响应状态异常')
      }
    } catch (error) {
      console.error('groupRequestService: 发送群聊申请失败', error)
      throw error
    }
  },

  /**
   * 获取用户的群聊申请记录
   *
   * 执行流程：
   * 1. 调用 API 获取用户申请列表
   * 2. 检查响应状态
   * 3. 返回申请列表数据
   *
   * 数据流：
   * - 输入：无（使用当前用户的认证信息）
   * - 输出：用户发送的所有群聊申请列表
   * - 副作用：无
   *
   * 使用场景：
   * - 用户查看自己发送的群聊申请状态
   * - 初始化用户申请数据
   *
   * API 33 - 查看群聊申请列表
   *
   * @returns {Promise<UserGroupRequestListResponse>} 用户申请列表响应
   * @throws {Error} 当API调用失败时抛出错误
   */
  async getUserGroupRequests (): Promise<UserGroupRequestListResponse> {
    console.log('groupRequestService: 开始获取用户群聊申请记录')

    try {
      // 调用 API
      const response = await authApi.get('/groups/get_request_list')

      // 检查响应状态
      if (response.status === 200 && response.data) {
        console.log('groupRequestService: 获取用户群聊申请记录成功', {
          total: response.data.total,
          count: response.data.requests?.length || 0,
        })
        return response.data
      } else {
        throw new Error('获取用户群聊申请记录失败：响应状态异常')
      }
    } catch (error) {
      console.error('groupRequestService: 获取用户群聊申请记录失败', error)
      throw error
    }
  },

  /**
   * 获取所有待审核的群聊申请列表
   *
   * 执行流程：
   * 1. 调用新的聚合API
   * 2. 服务端根据token自动判断权限并返回所有待审核申请
   * 3. 检查响应状态
   * 4. 返回申请列表数据
   *
   * 数据流：
   * - 输入：无（使用当前用户的认证信息）
   * - 输出：用户有权限审核的所有群聊申请列表
   * - 副作用：无
   *
   * 使用场景：
   * - 群主/管理员查看所有需要审核的群聊申请
   * - 初始化审核申请数据
   *
   * API 35 - 获取群聊申请审核列表
   *
   * @returns {Promise<GroupApprovalListResponse>} 所有群聊的申请列表响应
   * @throws {Error} 当API调用失败时抛出错误
   */
  async getAllPendingRequests (): Promise<GroupApprovalListResponse> {
    console.log('groupRequestService: 开始获取所有待审核的群聊申请列表')

    try {
      // 调用新的 GET API
      const response = await authApi.get('/groups/group_request_list')

      // 检查响应状态
      if (response.status === 200 && response.data) {
        console.log('groupRequestService: 获取所有待审核的群聊申请列表成功', {
          total: response.data.total,
          count: response.data.requests?.length || 0,
        })
        return response.data
      } else {
        throw new Error('获取所有待审核的群聊申请列表失败：响应状态异常')
      }
    } catch (error) {
      console.error('groupRequestService: 获取所有待审核的群聊申请列表失败', error)
      throw error
    }
  },

  /**
   * 处理群聊申请
   *
   * 执行流程：
   * 1. 验证申请ID和操作类型
   * 2. 构建请求参数
   * 3. 调用 API 处理申请
   * 4. 检查响应状态
   * 5. 返回处理结果
   *
   * 数据流：
   * - 输入：申请ID、操作类型（同意/拒绝）
   * - 输出：处理是否成功的标识
   * - 副作用：
   *   - 同意：将申请用户加入群聊
   *   - 拒绝：标记申请为已拒绝状态
   *
   * 使用场景：
   * - 群主/管理员同意用户加入群聊
   * - 群主/管理员拒绝用户加入群聊
   *
   * API 35 - 处理加入群聊申请
   *
   * @param {string} req_id - 申请ID
   * @param {'accept' | 'reject'} action - 操作类型
   * @returns {Promise<RespondGroupRequestResponse>} 处理申请的响应
   * @throws {Error} 当API调用失败时抛出错误
   */
  async respondGroupRequest (
    req_id: string,
    action: 'accept' | 'reject',
  ): Promise<RespondGroupRequestResponse> {
    console.log('groupRequestService: 开始处理群聊申请', { req_id, action })

    try {
      // 验证参数
      if (!req_id) {
        throw new Error('申请ID不能为空')
      }

      if (!['accept', 'reject'].includes(action)) {
        throw new Error('操作类型必须是 accept 或 reject')
      }

      // 构建请求参数
      const params: RespondGroupRequestParams = {
        req_id,
        action,
      }

      // 调用 API
      const response = await authApi.post('/groups/respond', params)

      // 检查响应状态
      if (response.status === 200 && response.data) {
        console.log('groupRequestService: 处理群聊申请成功', {
          req_id,
          action,
          success: response.data.success,
        })
        return response.data
      } else {
        throw new Error('处理群聊申请失败：响应状态异常')
      }
    } catch (error) {
      console.error('groupRequestService: 处理群聊申请失败', { req_id, action, error })
      throw error
    }
  },
}
