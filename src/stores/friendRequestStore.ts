import type { FriendRequest, FriendRequestStatus } from '@/types/friendRequest'
import { defineStore } from 'pinia'
import { computed, readonly, ref } from 'vue'
import { friendRequestService } from '@/service/friendRequestService'
import { useAuthStore } from '@/stores/authStore'
import { transformFriendRequestFromApi } from '@/types/friendRequest'

/**
 * 好友请求状态管理 Store
 *
 * 功能：
 * - 管理所有好友请求（发送和接收）的本地状态
 * - 提供各种视图（发送的、接收的、待处理的等）
 * - 处理请求的增删改查操作
 *
 * 使用场景：
 * - 好友请求列表页面展示
 * - 发送/响应好友请求
 * - WebSocket 推送实时更新
 */
export const useFriendRequestStore = defineStore('friendRequest', () => {
  // ========== 状态定义 ==========

  /**
   * 所有好友请求列表
   * 包含我发送的请求和接收到的请求
   * 按创建时间倒序排列（最新的在前）
   */
  const requests = ref<FriendRequest[]>([])

  /**
   * 加载状态
   * true：正在从服务器获取数据
   * false：空闲状态
   */
  const isLoading = ref(false)

  // ========== 辅助函数 ==========

  /**
   * 获取当前登录用户的ID
   * @returns {string} 用户ID，如果未登录返回空字符串
   */
  const getCurrentUserId = () => {
    const authStore = useAuthStore()
    return authStore.userId
  }

  // ========== 计算属性 ==========

  /**
   * 我发送的好友请求
   * 用于展示"已发送"的请求列表
   */
  const sentRequests = computed(() =>
    requests.value.filter(r => r.sender_uid === getCurrentUserId()),
  )

  /**
   * 我收到的好友请求
   * 用于展示"待处理"的请求列表
   */
  const receivedRequests = computed(() =>
    requests.value.filter(r => r.receiver_uid === getCurrentUserId()),
  )

  /**
   * 所有待处理的请求（发送和接收）
   * 用于显示未处理请求数量
   */
  const pendingRequests = computed(() =>
    requests.value.filter(r => r.status === 'pending'),
  )

  /**
   * 我发送的待处理请求
   * 用于展示已发送但未响应的请求
   */
  const pendingSentRequests = computed(() =>
    sentRequests.value.filter(r => r.status === 'pending'),
  )

  /**
   * 我收到的待处理请求
   * 用于展示需要我处理的请求
   */
  const pendingReceivedRequests = computed(() =>
    receivedRequests.value.filter(r => r.status === 'pending'),
  )

  /**
   * 待处理请求总数
   * 用于在UI上显示未读数量标记
   */
  const totalPending = computed(() =>
    pendingRequests.value.length,
  )

  // ========== Actions ==========

  /**
   * 从服务器获取好友请求列表
   *
   * 使用场景：
   * - 应用启动时初始化数据
   * - 下拉刷新请求列表
   * - 从其他页面返回时更新数据
   *
   * @throws {Error} 当网络请求失败时抛出错误
   */
  async function fetchFriendRequests () {
    isLoading.value = true
    try {
      // 调用API获取好友请求
      const response = await friendRequestService.getFriendRequestList()

      // 合并发送和接收的请求到一个列表
      const allRequests = [
        ...response.requests.map(r =>
          transformFriendRequestFromApi(r),
        ),
        ...response.receives.map(r =>
          transformFriendRequestFromApi(r),
        ),
      ]

      // 按创建时间倒序排列（最新的在前）
      requests.value = allRequests.sort((a, b) => b.create_time - a.create_time)

      console.log(`friendRequestStore: 获取好友请求列表 - 总数: ${allRequests.length}`)
    } catch (error) {
      console.error('friendRequestStore: 获取好友请求列表失败', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 添加或更新好友请求
   *
   * 使用场景：
   * - 发送新的好友请求后添加到列表
   * - 收到新的好友请求（WebSocket推送）
   * - 更新现有请求的信息
   *
   * @param {FriendRequest} request - 要添加的请求对象
   */
  function addRequest (request: FriendRequest) {
    // 检查是否已存在相同请求
    const existingIndex = requests.value?.findIndex(r => r.req_id === request.req_id) ?? -1
    if (existingIndex === -1) {
      // 添加新请求到列表开头（最新的在前）
      requests.value.unshift(request)
      console.log('friendRequestStore: 添加新的好友请求', request.req_id)
    } else {
      // 更新现有请求（避免重复添加）
      requests.value[existingIndex] = request
      console.log('friendRequestStore: 更新好友请求', request.req_id)
    }
  }

  /**
   * 更新请求状态
   *
   * 使用场景：
   * - 响应好友请求（同意/拒绝）
   * - WebSocket推送状态更新
   * - 请求过期自动更新
   *
   * @param {string} req_id - 请求ID
   * @param {FriendRequestStatus} status - 新的状态
   */
  function updateRequestStatus (req_id: string, status: FriendRequestStatus) {
    const index = requests.value?.findIndex(r => r.req_id === req_id) ?? -1
    if (index > -1 && requests.value) {
      const request = requests.value[index]
      if (request) {
        request.status = status
        console.log('friendRequestStore: 更新请求状态', req_id, status)
      }
    }
  }

  /**
   * 删除指定的请求
   *
   * 使用场景：
   * - 用户手动删除请求记录
   * - 清理过期的请求
   * - 撤销发送的请求
   *
   * @param {string} req_id - 要删除的请求ID
   */
  function removeRequest (req_id: string) {
    const originalLength = requests.value.length
    requests.value = requests.value.filter(r => r.req_id !== req_id)

    if (requests.value.length < originalLength) {
      console.log('friendRequestStore: 删除请求', req_id)
    }
  }

  /**
   * 重置所有状态
   *
   * 使用场景：
   * - 用户登出时清理数据
   * - 切换账号时重置状态
   * - 调试时清空数据
   */
  function reset () {
    requests.value = []
    isLoading.value = false
    console.log('friendRequestStore: 重置状态')
  }

  // ========== 返回状态和方法 ==========
  return {
    // 状态
    requests: readonly(requests), // 所有请求（只读）
    isLoading: readonly(isLoading), // 加载状态（只读）

    // 计算属性
    sentRequests: readonly(sentRequests), // 发送的请求
    receivedRequests: readonly(receivedRequests), // 接收的请求
    pendingRequests: readonly(pendingRequests), // 待处理请求
    pendingSentRequests: readonly(pendingSentRequests), // 发送的待处理请求
    pendingReceivedRequests: readonly(pendingReceivedRequests), // 接收的待处理请求
    totalPending, // 待处理总数

    // 方法
    fetchFriendRequests, // 获取请求列表
    addRequest, // 添加/更新请求
    updateRequestStatus, // 更新请求状态
    removeRequest, // 删除请求
    reset, // 重置状态
  }
})
