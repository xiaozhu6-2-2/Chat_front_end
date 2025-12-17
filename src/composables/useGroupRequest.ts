/**
 * 群聊申请业务逻辑组合
 *
 * 职责说明：
 * 1. 组合多个 Store：协调 groupRequestStore、groupStore 和 authStore
 * 2. 封装复杂业务逻辑：组合多个 actions 的场景
 * 3. 错误处理和用户反馈：snackbar 显示
 * 4. WebSocket 事件处理：实时更新申请状态
 *
 * 执行流程：
 * - 组件调用 composable 方法
 * - composable 协调 service 和 store
 * - 处理副作用（UI 更新、用户反馈）
 *
 * @author echat
 * @since 2025-12-16
 */

import type { GroupRequest, GroupRequestStatus } from '@/types/groupRequest'
import { useSnackbar } from '@/composables/useSnackbar'
import { groupRequestService } from '@/service/groupRequestService'
import { useAuthStore } from '@/stores/authStore'
import { useGroupRequestStore } from '@/stores/groupRequestStore'
import { useGroupStore } from '@/stores/groupStore'
import { transformUserGroupRequestFromApi, transformGroupApprovalFromApi, transformGroupRequestFromApi } from '@/types/groupRequest'

export function useGroupRequest() {
  // ========== 依赖注入 ==========

  const groupRequestStore = useGroupRequestStore()
  const groupStore = useGroupStore()
  const authStore = useAuthStore()
  const { showSuccess, showError } = useSnackbar()

  // ========== 核心业务逻辑 ==========

  /**
   * 发送加入群聊申请
   *
   * 执行流程：
   * 1. 调用 service 发送申请
   * 2. 转换 API 响应为 GroupRequest 对象（已包含完整群聊信息）
   * 3. 添加到本地状态
   * 4. 显示成功提示
   * 5. 返回响应数据
   *
   * 数据流：
   * - 输入：群聊ID、申请信息
   * - 输出：更新 store 状态，返回 API 响应
   * - 副作用：发送 API 请求，显示用户反馈
   *
   * 使用场景：
   * - 用户申请加入私有群聊
   * - 用户申请加入邀请制的群聊
   *
   * @param {string} gid - 群聊ID
   * @param {string} apply_text - 申请信息
   * @returns {Promise<any>} API 响应数据
   */
  const sendGroupRequest = async (gid: string, apply_text: string): Promise<any> => {
    console.log('useGroupRequest: 开始发送群聊申请', { gid, apply_text })

    try {
      // 调用服务层发送申请
      const response = await groupRequestService.sendGroupRequest(gid, apply_text)

      // API 32 现在返回完整的群聊和申请信息，直接转换
      // 使用 transformGroupRequestFromApi 来正确构建包含群信息的 GroupRequest 对象
      const groupRequest = transformGroupRequestFromApi(response, 'send')

      // 添加到本地状态
      groupRequestStore.addUserRequest(groupRequest)

      // 显示成功提示
      showSuccess('群聊申请已发送')
      return response
    } catch (error) {
      console.error('useGroupRequest: 发送群聊申请失败', error)
      throw error
    }
  }

  /**
   * 响应群聊申请
   *
   * 执行流程：
   * 1. 调用 service 响应申请
   * 2. 更新本地状态
   * 3. 如果接受申请，刷新群成员列表
   * 4. 显示操作结果
   * 5. 返回响应数据
   *
   * 数据流：
   * - 输入：申请ID、操作类型、群聊ID
   * - 输出：更新 store 状态，可能更新群成员，返回 API 响应
   * - 副作用：发送 API 请求，刷新群成员，显示用户反馈
   *
   * 使用场景：
   * - 群主/管理员同意用户加入群聊
   * - 群主/管理员拒绝用户加入群聊
   *
   * @param {string} req_id - 申请ID
   * @param {'accept' | 'reject'} action - 操作类型
   * @param {string} gid - 群聊ID
   * @returns {Promise<any>} API 响应数据
   */
  const respondGroupRequest = async (
    req_id: string,
    action: 'accept' | 'reject',
    gid: string
  ): Promise<any> => {
    console.log('useGroupRequest: 开始响应群聊申请', { req_id, action, gid })

    try {
      // 调用服务层响应申请
      const response = await groupRequestService.respondGroupRequest(req_id, action)

      // 更新本地状态
      const status = action === 'accept' ? 'accepted' as GroupRequestStatus : 'rejected' as GroupRequestStatus
      groupRequestStore.updateRequestStatus(req_id, status)

      // 如果接受了申请，需要刷新群成员列表
      if (action === 'accept') {
        console.log('useGroupRequest: 接受群聊申请，刷新群聊信息', { gid })
        try {
          await groupStore.fetchGroupMembers(gid, true)
        } catch (error) {
          console.error('useGroupRequest: 刷新群成员失败', error)
          // 不抛出错误，因为申请已经处理成功
        }
      }

      // 显示操作结果
      showSuccess(`已${action === 'accept' ? '同意' : '拒绝'}群聊申请`)
      return response
    } catch (error) {
      console.error('useGroupRequest: 响应群聊申请失败', error)
      // 错误由 HTTP interceptor 处理显示
      throw error
    }
  }

  // ========== WebSocket 推送处理 ==========

  /**
   * 处理新的群聊申请（WebSocket 推送）
   *
   * 执行流程：
   * 1. 判断申请类型（用户发送的或需要审核的）
   * 2. 根据类型选择转换函数
   * 3. 添加到相应的列表
   * 4. 显示提示信息
   *
   * 数据流：
   * - 输入：WebSocket 推送的申请数据
   * - 输出：更新 store 状态，显示用户提示
   * - 副作用：可能触发 UI 更新
   *
   * 使用场景：
   * - WebSocket 收到新申请通知
   * - 实时更新申请列表
   * 
   * 注意：目前假设WS推送的新申请结构体与API一致
   *
   * @param {any} request - WebSocket 推送的申请数据
   */
  const handleNewGroupRequest = (request: any): void => {
    console.log('useGroupRequest: 处理新的群聊申请', request)

    try {
      let groupRequest: GroupRequest

      // 判断是用户发送的申请还是需要审核的申请
      if (request.sender_uid === authStore.userId) {
        // 用户发送的申请，使用用户申请转换函数
        groupRequest = transformUserGroupRequestFromApi(request)
        groupRequestStore.addUserRequest(groupRequest)
      } else {
        // 需要用户审核的申请，API 已返回完整信息，直接转换
        groupRequest = transformGroupApprovalFromApi(request)

        groupRequestStore.addApprovalRequest(groupRequest)

        // 显示新申请提示
        showSuccess(`收到新的群聊加入申请：${request.sender_name}`)
      }
    } catch (error) {
      console.error('useGroupRequest: 处理新的群聊申请失败', error)
    }
  }

  /**
   * 收到WS通知某条申请的状态发生了变化
   *
   * 执行流程：
   * 1. 更新本地申请状态
   * 2. 根据状态显示相应提示
   * 3. 记录更新日志
   *
   * 数据流：
   * - 输入：申请ID、新状态
   * - 输出：更新 store 状态，显示状态提示
   * - 副作用：可能触发 UI 更新
   *
   * 使用场景：
   * - WebSocket 收到申请状态更新
   * - 实时同步申请状态
   *
   * @param {string} req_id - 申请ID
   * @param {GroupRequestStatus} status - 新状态
   */
  const handleGroupRequestUpdate = async (req_id: string, status: GroupRequestStatus): Promise<void> => {
    console.log('useGroupRequest: 处理群聊申请状态更新', { req_id, status })

    try {
      // 1. 查找申请并判断类型
      const userRequest = groupRequestStore.userRequests.find(r => r.req_id === req_id)
      const isUserRequest = !!userRequest

      // 查找审核申请（判断是否是需要审核的申请）
      const approvalRequest = groupRequestStore.approvalRequests.find(r => r.req_id === req_id)
      const isApprovalRequest = !!approvalRequest

      // 2. 更新请求状态
      groupRequestStore.updateRequestStatus(req_id, status)

      // 3. 根据状态执行相应操作
      switch (status) {
        case 'accepted':
          if (isUserRequest) {
            // 发送的申请被通过，强制刷新群聊列表
            console.log('useGroupRequest: 用户发送的申请被接受，刷新群聊列表')
            try {
              await groupStore.fetchGroups(true)
              showSuccess('群聊申请已被接受，已更新群聊列表')
            } catch (fetchError) {
              console.error('useGroupRequest: 刷新群聊列表失败', fetchError)
              showSuccess('群聊申请已被接受')
            }
          }
          break
        case 'rejected':
          if (isUserRequest) {
            showSuccess('群聊申请已被拒绝')
          }
          break
        case 'expired':
          if (isUserRequest) {
            showSuccess('群聊申请已过期')
          }
          break
        default:
          console.log('useGroupRequest: 未知的申请状态', { req_id, status })
          break
      }

      // 4. 记录更新日志
      console.log('useGroupRequest: 群聊申请状态更新完成', {
        req_id,
        status,
        isUserRequest,
        isApprovalRequest,
        gid: userRequest?.gid || approvalRequest?.gid,
        timestamp: Date.now()
      })
    } catch (error) {
      console.error('useGroupRequest: 处理群聊申请状态更新失败', {
        req_id,
        status,
        error
      })
    }
  }

  // ========== 返回接口 ==========

  return {
    // ========== 核心业务方法 ==========
    sendGroupRequest,
    respondGroupRequest,

    // ========== WebSocket 事件处理 ==========
    handleNewGroupRequest,
    handleGroupRequestUpdate
  }
}