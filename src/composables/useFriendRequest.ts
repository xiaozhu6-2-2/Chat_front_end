import type {
  FriendRequestStatus,
} from '@/types/friendRequest'
import { useSnackbar } from '@/composables/useSnackbar'
import { friendRequestService } from '@/service/friendRequestService'
import { useAuthStore } from '@/stores/authStore'
import { useFriendRequestStore } from '@/stores/friendRequestStore'
import { useFriendStore } from '@/stores/friendStore'
import { transformFriendRequestFromApi } from '@/types/friendRequest'
import { useFriend } from './useFriend' // 导入useFriend以获取fetchFriends和updateFriendProfile

// 待设置标签的临时存储
const pendingFriendTags = new Map<string, { tags: string[], remark?: string }>()

/**
 * 好友请求管理 Composable
 *
 * 功能：
 * - 封装好友请求相关的业务逻辑
 * - 协调 Service 和 Store 层的交互
 * - 处理用户交互反馈（snackbar）
 * - 提供 WebSocket 推送处理接口
 *
 * 使用示例：
 * ```typescript
 * const { sendFriendRequest, respondFriendRequest, refreshRequests } = useFriendRequest();
 *
 * // 发送好友请求
 * await sendFriendRequest('user123', 'Hi!');
 *
 * // 响应好友请求
 * await respondFriendRequest('req123', 'accept');
 * ```
 */
export function useFriendRequest () {
  // 依赖注入
  const friendRequestStore = useFriendRequestStore()
  const friendStore = useFriendStore()
  const authStore = useAuthStore()
  const { showSuccess, showError } = useSnackbar()
  const { fetchFriends } = useFriend() // 获取fetchFriends方法

  // ========== 核心业务逻辑 ==========

  /**
   * 发送好友请求
   *
   * 处理流程：
   * 1. 调用 API 发送请求
   * 2. 更新本地状态（添加到请求列表）
   * 3. 显示成功提示
   * 4. 返回响应结果
   *
   * 使用场景：
   * - 用户在搜索页面点击"添加好友"
   * - 用户在个人主页点击"发送好友请求"
   * - 用户通过其他途径发送好友请求
   *
   * @param {string} receiver_id - 接收者用户ID
   * @param {string} message - 申请消息
   * @returns {Promise<any>} API 响应结果
   * @throws {Error} 当发送失败时抛出错误
   *
   * @example
   * ```typescript
   * try {
   *   await sendFriendRequest('user123', '我想和你成为朋友');
   * } catch (error) {
   *   console.error('发送失败:', error);
   * }
   * ```
   */
  const sendFriendRequest = async (receiver_id: string, message: string, tags?: string[], remark?: string) => {
    try {
      console.log('useFriendRequest: 发送好友请求', { receiver_id, message, tags, remark })

      // 调用服务层发送请求
      const response = await friendRequestService.sendFriendRequest(receiver_id, message)

      // 转换并添加到本地状态
      const newRequest = transformFriendRequestFromApi(response, 'sent')
      friendRequestStore.addRequest(newRequest)

      // 保存待设置的标签和备注
      if (tags && tags.length > 0) {
        pendingFriendTags.set(receiver_id, { tags, remark })
        console.log('useFriendRequest: 保存待设置标签', { receiver_id, tags, remark })
      }

      // 显示成功提示
      showSuccess('好友请求已发送')
      return response
    } catch (error) {
      console.error('useFriendRequest: 发送好友请求失败', error)
      // 错误由 HTTP 拦截器统一处理，这里只需抛出
      throw error
    }
  }

  /**
   * 响应好友请求
   *
   * 处理流程：
   * 1. 调用 API 响应请求（同意/拒绝）
   * 2. 更新本地状态
   * 3. 如果同意，刷新好友列表
   * 4. 显示操作结果提示
   *
   * 使用场景：
   * - 用户在好友请求列表中点击"同意"
   * - 用户在好友请求列表中点击"拒绝"
   * - 用户通过通知快捷操作响应请求
   *
   * @param {string} req_id - 请求ID
   * @param {'accept' | 'reject'} action - 操作类型（accept/reject）
   * @returns {Promise<any>} API 响应结果
   * @throws {Error} 当响应失败时抛出错误
   *
   * @example
   * ```typescript
   * // 同意好友请求
   * await respondFriendRequest('req123', 'accept');
   *
   * // 拒绝好友请求
   * await respondFriendRequest('req123', 'reject');
   * ```
   */
  const respondFriendRequest = async (req_id: string, action: 'accept' | 'reject') => {
    try {
      console.log('useFriendRequest: 响应好友请求', { req_id, action })

      // 调用服务层响应请求
      const response = await friendRequestService.respondFriendRequest(req_id, action)

      // 更新本地状态
      const status = action === 'accept' ? 'accepted' as FriendRequestStatus : 'rejected' as FriendRequestStatus
      friendRequestStore.updateRequestStatus(req_id, status)

      // 如果接受了好友请求，需要刷新好友列表以包含新好友
      if (action === 'accept') {
        console.log('useFriendRequest: 接受好友请求，刷新好友列表')
        await fetchFriends(true) // 强制刷新好友列表
      }

      // 显示操作结果
      showSuccess(`已${action === 'accept' ? '同意' : '拒绝'}好友请求`)
      return response
    } catch (error) {
      console.error('useFriendRequest: 响应好友请求失败', error)
      throw error
    }
  }

  // ========== WebSocket 推送处理 ==========

  /**
   * 处理WebSocket 推送的新的好友请求
   *
   * 使用场景：
   * - 接收到新的好友请求推送
   * - 实时更新请求列表
   * - 显示新请求通知
   *
   * @param {any} request - 推送的好友请求对象
   */
  const handleNewFriendRequest = (request: any) => {
    console.log('useFriendRequest: 处理新的好友请求', request)

    // 转换并添加到请求列表
    const friendRequest = transformFriendRequestFromApi(request, 'received')
    friendRequestStore.addRequest(friendRequest)

    // 如果是接收到的请求，显示通知
    if (request.receiver_uid === authStore.userId) {
      showSuccess('收到新的好友请求')
    }
  }

  /**
   * 处理Websocket好友请求状态更新
   *
   * 使用场景：
   * - 对方处理了我的好友请求
   * - 实时更新请求状态
   * - 刷新好友列表（如果被接受）
   * - 设置好友标签（如果有待设置的标签）
   *
   * @param {string} req_id - 请求ID
   * @param {FriendRequestStatus} status - 新状态
   */
  const handleFriendRequestUpdate = async (req_id: string, status: FriendRequestStatus, receiverUid?: string) => {
    console.log('useFriendRequest: 处理好友请求状态更新', req_id, status)

    // 更新请求状态
    friendRequestStore.updateRequestStatus(req_id, status)

    // 根据状态显示相应提示
    if (status === 'accepted') {
      showSuccess('好友请求已被接受')

      // 刷新好友列表
      await fetchFriends(true)

      // 检查是否有待设置的标签
      if (receiverUid && pendingFriendTags.has(receiverUid)) {
        const pending = pendingFriendTags.get(receiverUid)
        if (pending) {
          console.log('useFriendRequest: 检测到待设置标签', { receiverUid, pending })

          // 等待一下确保好友列表已更新
          setTimeout(async () => {
            try {
              // 查找好友关系
              const friend = friendStore.getFriendByUid(receiverUid)
              if (friend && friend.fid) {
                console.log('useFriendRequest: 找到好友，开始设置标签', { fid: friend.fid, pending })

                // 调用 updateFriendProfile 设置标签
                const { updateFriendProfile } = useFriend()
                // 设置标签（取第一个标签作为主要标签）
                const tag = pending.tags[0] || undefined
                await updateFriendProfile(friend.fid, {
                  tag,
                  remark: pending.remark,
                })

                showSuccess('好友标签设置成功')
                // 清除临时存储
                pendingFriendTags.delete(receiverUid)
              } else {
                console.warn('useFriendRequest: 未找到好友关系，稍后重试', { receiverUid })
                // 如果还没找到，可能需要延迟更长时间或重试
              }
            } catch (error) {
              console.error('useFriendRequest: 设置好友标签失败', error)
            }
          }, 500) // 延迟500ms确保好友列表已更新
        }
      }
    } else if (status === 'rejected') {
      showSuccess('好友请求已被拒绝')
      // 清除临时存储
      if (receiverUid) {
        pendingFriendTags.delete(receiverUid)
      }
    }
  }

  /**
   * 获取好友请求列表
   *
   * 执行流程：
   * 1. 调用 friendRequestService 获取请求列表
   * 2. 转换数据格式
   * 3. 更新 friendRequestStore
   * 4. 处理错误和用户反馈
   *
   * 数据流：
   * - 输入：无参数
   * - 输出：更新 store 中的请求列表
   * - 副作用：发送 HTTP 请求，显示用户反馈
   *
   * @returns {Promise<void>}
   */
  const fetchFriendRequests = async (): Promise<void> => {
    friendRequestStore.setLoading(true)
    try {
      const response = await friendRequestService.getFriendRequestList()
      friendRequestStore.setRequestsFromApi(response)
      console.log('useFriendRequest: 好友请求列表获取成功')
    } catch (error) {
      console.error('useFriendRequest: 获取好友请求列表失败', error)
      showError('获取好友请求列表失败，请刷新重试')
      throw error
    } finally {
      friendRequestStore.setLoading(false)
    }
  }

  /**
   * 重置好友请求模块状态
   *
   * 使用场景：
   * - 用户登出时清理数据
   */
  const reset = (): void => {
    friendRequestStore.reset()
    console.log('useFriendRequest: 重置好友请求模块状态')
  }

  /**
   * 初始化好友请求模块
   *
   * 执行流程：
   * 1. 调用 fetchFriendRequests 获取请求列表
   * 2. 处理初始化错误
   *
   * 使用场景：
   * - 用户登录后初始化数据
   *
   * @param {boolean} force 是否强制初始化（默认true）
   * @returns {Promise<void>}
   */
  const init = async (force = true): Promise<void> => {
    // 如果不强制初始化且已有数据，可以跳过
    if (!force && friendRequestStore.requests.length > 0) {
      console.log('useFriendRequest: 好友请求列表已缓存，跳过初始化')
      return
    }

    await fetchFriendRequests()
  }

  // ========== 返回接口 ==========

  return {
    // ========== 方法 ==========
    fetchFriendRequests, // 新增：获取好友请求列表
    init, // 新增：初始化好友请求模块
    reset, // 新增：重置好友请求模块状态
    sendFriendRequest, // 发送好友请求
    respondFriendRequest, // 响应好友请求
    handleNewFriendRequest, // 处理新请求推送
    handleFriendRequestUpdate, // 处理状态更新推送

    // ========== 状态（从 Store 获取） ==========
    requests: friendRequestStore.requests, // 所有请求
    sentRequests: friendRequestStore.sentRequests, // 发送的请求
    receivedRequests: friendRequestStore.receivedRequests, // 接收的请求
    pendingRequests: friendRequestStore.pendingRequests, // 待处理请求
    pendingSentRequests: friendRequestStore.pendingSentRequests, // 发送的待处理
    pendingReceivedRequests: friendRequestStore.pendingReceivedRequests, // 接收的待处理
    totalPending: friendRequestStore.totalPending, // 待处理总数
    isLoading: friendRequestStore.isLoading, // 加载状态
  }
}
