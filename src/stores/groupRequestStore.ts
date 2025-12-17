/**
 * 群聊申请状态管理 Store
 *
 * 职责：
 * - 管理群聊申请相关状态
 * - 封装申请相关的数据操作
 * - 提供计算属性用于派生状态
 * - 与 service 层交互处理数据持久化
 *
 * 状态设计：
 * - userRequests: 用户发送的申请记录
 * - approvalRequests: 需要审核的申请（按群ID分组存储）
 * - 独立的 loading 状态管理
 *
 * @author echat
 * @since 2025-12-16
 */

import type { GroupRequest } from '@/types/groupRequest'
import { GroupRequestStatus } from '@/types/groupRequest'
import { defineStore } from 'pinia'
import { computed, readonly, ref } from 'vue'
import { groupRequestService } from '@/service/groupRequestService'
import { useAuthStore } from '@/stores/authStore'
import { transformUserGroupRequestFromApi, transformGroupApprovalFromApi } from '@/types/groupRequest'

export const useGroupRequestStore = defineStore('groupRequest', () => {
  // ========== 状态定义 ==========

  /**
   * 用户发送的群聊申请记录
   * 包含当前用户所有发送的群聊加入申请
   */
  const userRequests = ref<GroupRequest[]>([])

  /**
   * 需要审核的群聊申请
   * 当前用户作为群主/管理员收到的申请
   * 使用简单数组存储，通过过滤实现按群查询
   */
  const approvalRequests = ref<GroupRequest[]>([])

  /**
   * 加载状态
   * isLoading: 用户申请记录的加载状态
   * isLoadingApprovals: 审核申请的加载状态
   */
  const isLoading = ref(false)
  const isLoadingApprovals = ref(false)

  /**
   * 错误状态
   */
  const error = ref<string | null>(null)

  // ========== 辅助函数 ==========

  /**
   * 获取当前用户ID
   *
   * @returns {string} 当前用户ID
   */
  const getCurrentUserId = (): string => {
    const authStore = useAuthStore()
    return authStore.userId || ''
  }

  // ========== 计算属性 ==========

  /**
   * 用户发送的待处理申请
   * 过滤出状态为 PENDING 的申请
   *
   * @returns {ComputedRef<GroupRequest[]>} 待处理的用户申请列表
   */
  const pendingUserRequests = computed(() =>
    userRequests.value.filter(request => request.status === GroupRequestStatus.PENDING)
  )

  /**
   * 所有待审核的申请
   * 过滤出所有状态为 PENDING 的申请
   *
   * @returns {ComputedRef<GroupRequest[]>} 待审核的申请列表
   */
  const pendingApprovalRequests = computed(() =>
    approvalRequests.value
      .filter(r => r.status === GroupRequestStatus.PENDING)
      .sort((a, b) => b.create_time - a.create_time)
  )

  /**
   * 用户申请总数
   *
   * @returns {ComputedRef<number>} 用户申请总数
   */
  const totalUserRequests = computed(() => userRequests.value.length)

  /**
   * 待审核申请总数
   *
   * @returns {ComputedRef<number>} 待审核申请总数
   */
  const totalPendingApprovals = computed(() => pendingApprovalRequests.value.length)

  /**
   * 获取指定群聊的待审核申请
   *
   * @param {string} gid - 群聊ID
   * @returns {GroupRequest[]} 该群聊的待审核申请列表
   */
  const getPendingRequestsByGroup = (gid: string): GroupRequest[] => {
    return approvalRequests.value
      .filter(r => r.gid === gid && r.status === GroupRequestStatus.PENDING)
      .sort((a, b) => b.create_time - a.create_time)
  }

  // ========== Actions ==========

  /**
   * 获取用户的群聊申请记录
   *
   * 执行流程：
   * 1. 设置加载状态
   * 2. 调用 service 获取申请列表
   * 3. 转换并存储数据
   * 4. 按创建时间排序
   * 5. 重置加载状态
   *
   * 数据流：
   * - 输入：无（使用当前用户的认证信息）
   * - 输出：更新 userRequests 状态
   * - 副作用：发送 API 请求
   *
   * 使用场景：
   * - 用户登录后初始化申请数据
   * - 刷新申请状态
   */
  async function fetchUserRequests(): Promise<void> {
    console.log('groupRequestStore: 开始获取用户群聊申请记录')

    isLoading.value = true
    error.value = null

    try {
      const response = await groupRequestService.getUserGroupRequests()

      // 转换并存储数据
      userRequests.value = response.requests.map(request =>
        transformUserGroupRequestFromApi(request)
      ).sort((a, b) => b.create_time - a.create_time) // 最新的在前面

      console.log('groupRequestStore: 获取用户群聊申请记录成功', {
        total: response.total,
        loaded: userRequests.value.length
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取用户群聊申请记录失败'
      error.value = errorMessage
      console.error('groupRequestStore: 获取用户群聊申请记录失败', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 获取所有待审核的群聊申请列表
   *
   * 执行流程：
   * 1. 设置加载状态
   * 2. 调用 service 获取所有申请列表
   * 3. 转换并直接存储到数组中
   * 4. 按创建时间排序
   * 5. 重置加载状态
   *
   * 数据流：
   * - 输入：无（使用当前用户的认证信息）
   * - 输出：更新整个 approvalRequests 数组
   * - 副作用：发送 API 请求
   *
   * 使用场景：
   * - 群主/管理员查看所有需要审核的申请
   * - 初始化审核申请数据
   * - 刷新所有审核申请列表
   */
  async function fetchAllApprovalRequests(): Promise<void> {
    console.log('groupRequestStore: 开始获取所有待审核的群聊申请列表')

    isLoadingApprovals.value = true
    error.value = null

    try {
      const response = await groupRequestService.getAllPendingRequests()

      // 直接存储为数组，按时间排序（最新的在前面）
      approvalRequests.value = response.requests
        .map(request => transformGroupApprovalFromApi(request))
        .sort((a, b) => b.create_time - a.create_time)

      console.log('groupRequestStore: 获取所有待审核的群聊申请列表成功', {
        total: response.total,
        loaded: response.requests.length
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取所有待审核的群聊申请列表失败'
      error.value = errorMessage
      console.error('groupRequestStore: 获取所有待审核的群聊申请列表失败', err)
      throw err
    } finally {
      isLoadingApprovals.value = false
    }
  }

  /**
   * 添加或更新用户申请记录
   *
   * 执行流程：
   * 1. 查找是否已存在相同申请
   * 2. 如果存在则更新，否则添加到列表开头
   * 3. 记录操作日志
   *
   * 数据流：
   * - 输入：申请对象
   * - 输出：更新 userRequests 数组
   * - 副作用：可能触发UI更新
   *
   * 使用场景：
   * - 发送新申请后添加到列表
   * - WebSocket 推送申请状态更新
   *
   * @param {GroupRequest} request - 申请对象
   */
  function addUserRequest(request: GroupRequest): void {
    const existingIndex = userRequests.value.findIndex(r => r.req_id === request.req_id)

    if (existingIndex === -1) {
      // 新申请，添加到列表开头
      userRequests.value.unshift(request)
      console.log('groupRequestStore: 添加新的用户申请', { req_id: request.req_id })
    } else {
      // 更新现有申请
      userRequests.value[existingIndex] = request
      console.log('groupRequestStore: 更新用户申请', { req_id: request.req_id })
    }
  }

  /**
   * 添加或更新审核申请
   *
   * 执行流程：
   * 1. 查找是否已存在相同申请
   * 2. 如果存在则更新，否则添加到列表开头
   * 3. 记录操作日志
   *
   * 数据流：
   * - 输入：申请对象
   * - 输出：更新 approvalRequests 数组
   * - 副作用：可能触发UI更新
   *
   * 使用场景：
   * - 收到新的加入申请
   * - WebSocket 推送申请状态更新
   *
   * @param {GroupRequest} request - 申请对象
   */
  function addApprovalRequest(request: GroupRequest): void {
    const existingIndex = approvalRequests.value.findIndex(r => r.req_id === request.req_id)

    if (existingIndex === -1) {
      // 新申请，添加到列表开头
      approvalRequests.value.unshift(request)
      console.log('groupRequestStore: 添加新的审核申请', {
        req_id: request.req_id,
        gid: request.gid
      })
    } else {
      // 更新现有申请
      approvalRequests.value[existingIndex] = request
      console.log('groupRequestStore: 更新审核申请', {
        req_id: request.req_id,
        gid: request.gid
      })
    }
  }

  /**
   * 更新申请状态
   *
   * 执行流程：
   * 1. 在用户申请记录中查找并更新
   * 2. 在审核申请记录中查找并更新
   * 3. 记录更新日志
   *
   * 数据流：
   * - 输入：申请ID、新状态
   * - 输出：更新两个列表中的申请状态
   * - 副作用：可能触发UI更新
   *
   * 使用场景：
   * - 处理申请后更新状态
   * - WebSocket 推送状态更新
   *
   * @param {string} req_id - 申请ID
   * @param {GroupRequestStatus} status - 新状态
   */
  function updateRequestStatus(req_id: string, status: GroupRequestStatus): void {
    // 更新用户申请记录
    const userIndex = userRequests.value.findIndex(r => r.req_id === req_id)
    if (userIndex > -1 && userRequests.value[userIndex]) {
      userRequests.value[userIndex].status = status
      console.log('groupRequestStore: 更新用户申请状态', { req_id, status })
    }

    // 更新审核申请记录
    const approvalIndex = approvalRequests.value.findIndex(r => r.req_id === req_id)
    if (approvalIndex > -1) {
      const request = approvalRequests.value[approvalIndex]
      if (request) {
        request.status = status
      }
      console.log('groupRequestStore: 更新审核申请状态', { req_id, status })
    }
  }

  /**
   * 从审核列表中移除申请
   *
   * 执行流程：
   * 1. 过滤数组移除匹配的申请
   * 2. 记录移除日志
   *
   * 数据流：
   * - 输入：申请ID
   * - 输出：从 approvalRequests 数组中移除指定申请
   * - 副作用：可能触发UI更新
   *
   * 使用场景：
   * - 申请处理后从列表移除
   * - 清理过期的申请
   *
   * @param {string} req_id - 申请ID
   */
  function removeApprovalRequest(req_id: string): void {
    const originalLength = approvalRequests.value.length
    approvalRequests.value = approvalRequests.value.filter(r => r.req_id !== req_id)

    if (approvalRequests.value.length < originalLength) {
      console.log('groupRequestStore: 从审核列表移除申请', { req_id })
    } else {
      console.log('groupRequestStore: 未找到要移除的审核申请', { req_id })
    }
  }

  /**
   * 重置所有状态
   *
   * 执行流程：
   * 1. 清空所有数据数组
   * 2. 重置加载状态
   * 3. 清空错误信息
   * 4. 记录重置日志
   *
   * 数据流：
   * - 输入：无
   * - 输出：重置所有状态到初始值
   * - 副作用：可能触发UI重置
   *
   * 使用场景：
   * - 用户登出时清理数据
   * - 调试时重置状态
   */
  function reset(): void {
    userRequests.value = []
    approvalRequests.value = []
    isLoading.value = false
    isLoadingApprovals.value = false
    error.value = null

    console.log('groupRequestStore: 重置所有状态')
  }

  // ========== 返回状态和方法 ==========

  return {
    // 状态（只读）
    userRequests: readonly(userRequests),
    approvalRequests: readonly(approvalRequests),
    isLoading: readonly(isLoading),
    isLoadingApprovals: readonly(isLoadingApprovals),
    error: readonly(error),

    // 计算属性
    pendingUserRequests: readonly(pendingUserRequests),
    pendingApprovalRequests: readonly(pendingApprovalRequests),
    totalUserRequests,
    totalPendingApprovals,

    // 方法
    fetchUserRequests,
    fetchAllApprovalRequests,
    addUserRequest,
    addApprovalRequest,
    updateRequestStatus,
    removeApprovalRequest,
    getPendingRequestsByGroup,
    reset
  }
})