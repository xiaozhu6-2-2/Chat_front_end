import type { Ref } from 'vue'
import type { FriendNotificationDetail, FriendRequest, FriendWithUserInfo, Message, UserProfile, UserSearchResult } from './messageTypes'

// service/message.ts
/*
1、群聊私聊区分：chatType
2、消息ID生成：采用时间戳+随机数，首次获取历史消息时，按时间戳排列。
3、接收的/发送的新消息无脑入队尾
4、send封装需要ws实例
5、使用真实API和WebSocket通信
*/
import { computed, reactive } from 'vue'
import { authApi } from './api'
import { friendService } from './friendService'
import { ContentType, LocalMessage, MessageStatus, MessageText, MessageType } from './messageTypes'
import { websocketService } from './websocket'

class MessageService {
  // 消息map，group、private、Notification
  // 每个群聊、私聊维护一个数组，按时间戳排列
  groupMessages = reactive(new Map<string, LocalMessage[]>())
  privateMessages = reactive(new Map<string, LocalMessage[]>())
  notificationMessages = reactive(new Map<string, LocalMessage[]>())

  userId: string | undefined = undefined
  token: string | undefined = undefined
  isInitialized = false
  // 用于记录已加载历史消息的群聊
  loadedChats: Set<string> = new Set()

  constructor () {
    // 构造函数
  }

  async init (token: string, userId: string): Promise<void> {
    this.token = token
    this.userId = userId

    try {
      // 获取历史通知消息
      await this.fetchHistoryNotificationMessages()
      for (const messages of this.notificationMessages) {
        this.sortMessages(messages)
      }
    } catch (error) {
      console.error('Failed to connect WebSocket:', error)
      throw new Error(`WebSocket连接失败: ${error}`)
    }

    this.isInitialized = true
    console.log('MessageService initialized successfully', {
      userId: this.userId,
    })
  }

  // 入列操作，判断消息类型，入队尾
  enqueueMessage (message: LocalMessage) {
    const reactiveMessage = reactive(message)
    switch (reactiveMessage.type) {
      case 'Group': {
        let chatId = reactiveMessage.payload.chatId
        if (!chatId) {
          console.warn('群聊消息缺少receiverId')
          return
        }
        if (!this.groupMessages.has(chatId)) {
          // 创建的消息数组必须是reactive
          this.groupMessages.set(chatId, reactive([]))
        }
        // 判断是否已存在相同的消息
        const arr = this.groupMessages.get(chatId)!
        if (arr.some(m => m.payload.messageId === reactiveMessage.payload.messageId)) {
          return
        }
        arr.push(reactiveMessage)
        break
      }
      case 'Private': {
        // 私聊消息
        let chatId = reactiveMessage.payload.chatId
        if (!chatId) {
          console.warn('私聊消息缺少receiverId')
          return
        }
        if (!this.privateMessages.has(chatId)) {
          this.privateMessages.set(chatId, reactive([]))
        }
        // 判断是否已存在相同的消息
        const arr = this.privateMessages.get(chatId)!
        if (arr.some(m => m.payload.messageId === reactiveMessage.payload.messageId)) {
          return
        }
        arr.push(reactiveMessage)
        break
      }
      case 'Notification': {
        // 通知消息，通过chatType区分
        let notificationId = reactiveMessage.payload.contentType
        if (!notificationId) {
          console.warn('通知消息缺少contentType')
          return
        }
        if (!this.notificationMessages.has(notificationId)) {
          this.notificationMessages.set(notificationId, reactive([]))
        }
        // 判断是否已存在相同的消息
        const arr = this.notificationMessages.get(notificationId)!
        if (arr.some(m => m.payload.messageId === reactiveMessage.payload.messageId)) {
          return
        }
        arr.push(reactiveMessage)
        break
      }
      default: {
        console.warn(`非法消息类型：${reactiveMessage.type} 尝试入列`)
      }
    }
  }

  // 排序操作，找到chatId和消息类型对应的消息数组，按时间戳排序
  private sortMessages (messages: LocalMessage[] | undefined) {
    if (!messages) {
      return
    }
    messages.sort((a, b) => a.payload.timestamp! - b.payload.timestamp!)
  }

  // 拉取历史通知
  private async fetchHistoryNotificationMessages (): Promise<void> {
    if (!this.token) {
      console.error('token为空, 无法拉取历史通知')
      return
    }
    try {
      const response = await authApi.post('/history/notifications')
      if (response.status === 200) {
        const messages: Message[] = response.data.messages
        for (const message of messages) {
          const localMessage = LocalMessage.toLocalMessage(message)
          this.enqueueMessage(localMessage)
        }
      } else {
        console.error(`拉取历史通知失败：${response.status} ${response.data.message}`)
        alert(`拉取历史通知失败：${response.status} ${response.data.message}`)
      }
    } catch (error) {
      console.error(`调用拉取历史通知接口失败：${error}`)
    }
  }

  // 历史消息按需加载并排序，需要传入聊天号
  async fetchHistoryPrivateMessages (chatId: string): Promise<void> {
    if (this.loadedChats.has(chatId)) {
      return
    }
    this.loadedChats.add(chatId)

    try {
      const response = await authApi.post('/history/private', { chatId })
      if (response.status === 200) {
        const messages: Message[] = response.data.messages
        for (const message of messages) {
          const localMessage = LocalMessage.toLocalMessage(message)
          this.enqueueMessage(localMessage)
        }
        if (this.privateMessages.has(chatId)) {
          this.sortMessages(this.privateMessages.get(chatId))
        }
      } else {
        console.error(`拉取历史私聊失败：${response.status} ${response.data.message}`)
        alert(`拉取历史私聊失败：${response.status} ${response.data.message}`)
      }
    } catch (error) {
      this.loadedChats.delete(chatId)
      console.error(`拉取历史私聊失败：${error}`)
      alert(`拉取历史私聊失败：${error}`)
    }
  }

  async fetchHistoryGroupMessages (chatId: string): Promise<void> {
    // 未拉取过的群聊不拉取历史消息
    if (this.loadedChats.has(chatId)) {
      return
    }
    this.loadedChats.add(chatId)

    try {
      const response = await authApi.post('/history/group', { chatId })
      if (response.status === 200) {
        const messages: Message[] = response.data.messages
        for (const message of messages) {
          const localMessage = LocalMessage.toLocalMessage(message)
          this.enqueueMessage(localMessage)
        }
        if (this.groupMessages.has(chatId)) {
          this.sortMessages(this.groupMessages.get(chatId))
        }
      } else {
        console.error(`拉取历史群聊失败：${response.status} ${response.data.message}`)
        alert(`拉取历史群聊失败：${response.status} ${response.data.message}`)
      }
    } catch (error) {
      this.loadedChats.delete(chatId)
      console.error(`拉取历史群聊失败：${error}`)
      alert(`拉取历史群聊失败：${error}`)
    }
  }

  // ws的onmessage中调用，根据type决定接收的新消息是否入列
  updateMessage (message: Message) {
    const localMessage = LocalMessage.toLocalMessage(message)
    this.enqueueMessage(localMessage)
    switch (localMessage.type) {
      case 'Group':
      case 'Private':
      case 'Notification': {
        if (localMessage.payload.senderId === this.userId) {
          localMessage.userIsSender = true
        }
        this.enqueueMessage(localMessage)
        break
      }
      case 'System': {
        // todo:系统消息，需要根据chatType分别维护状态列表
        break
      }
      default: {
        console.warn(`未知消息类型：${localMessage.type} 尝试更新`)
      }
    }
  }

  // 这里的send是用于需要入列的消息，比如私聊、群聊、通知等
  sendWithUpdate (message: LocalMessage) {
    // 通过WebSocket发送
    // ws连接检测、消息发送队列都在wsService中维护
    try {
      websocketService.send(message)
      this.enqueueMessage(message)
      console.log(`发送消息：${message} 入列`)
    } catch (error) {
      console.error(error)
      // 发送失败时标记消息状态
      message.sendStatus = MessageStatus.FAILED
    }
  }

  // 不入列发送，用于ping/pong/system等消息
  sendWithoutUpdate (message: LocalMessage) {
    console.log(`发送消息：${message} 不入列`)
    // 通过WebSocket发送
    websocketService.send(message)
  }

  // 组件获取消息列表，返回computed是为了保证map.get(id)时，id变化时，messages也会响应式更新
  // reactive(map)并不能监测 .get(id) 的变化，所以需要用computed包裹
  getMessages (mapType: string, idRef: Ref<string>) {
    let map: Map<string, LocalMessage[]>

    switch (mapType) {
      case 'Group': {
        map = this.groupMessages
        break
      }
      case 'Private': {
        map = this.privateMessages
        break
      }
      case 'Notification': {
        map = this.notificationMessages
        break
      }
      default: {
        throw new Error(`Unknown mapType: ${mapType}`)
      }
    }

    return computed(() => map.get(idRef.value) || [])
  }

  // ============ 好友相关的服务方法 ============

  /**
   * 搜索用户
   * @param query 搜索关键词
   * @returns 搜索结果
   */
  async searchUsers (query: string): Promise<UserSearchResult[]> {
    return await friendService.searchUsers(query)
  }

  /**
   * 发送好友请求
   * @param receiver_uid 接收者用户ID
   * @param apply_text 申请文本
   * @param tags 标签数组
   * @returns 好友请求数据
   */
  async sendFriendRequest (receiver_uid: string, apply_text?: string, tags?: string[]): Promise<FriendRequest> {
    try {
      // 1. 创建好友请求（数据层操作）
      const request = await friendService.createFriendRequest(receiver_uid, apply_text, tags)

      // 2. 创建好友请求通知消息并通过现有消息系统发送
      await this.sendFriendRequestMessage(receiver_uid, request, apply_text)

      return request
    } catch (error) {
      console.error('发送好友请求失败:', error)
      throw error
    }
  }

  /**
   * 响应好友请求
   * @param req_id 请求ID
   * @param status 响应状态
   */
  async respondToFriendRequest (req_id: string, status: 'accepted' | 'rejected'): Promise<void> {
    try {
      // 1. 调用数据层API处理响应（后端处理数据库操作）
      await friendService.respondToFriendRequest(req_id, status)

      // 2. 创建好友响应通知消息并通过现有消息系统发送
      await this.sendFriendResponseMessage(req_id, status)
    } catch (error) {
      console.error('响应好友请求失败:', error)
      throw error
    }
  }

  /**
   * 获取好友列表
   * @returns 好友列表
   */
  async getFriends (): Promise<FriendWithUserInfo[]> {
    return await friendService.getFriends()
  }

  /**
   * 获取待处理的好友请求
   * @returns 请求列表
   */
  async getPendingRequests (): Promise<{
    receivedRequests: FriendRequest[]
    sentRequests: FriendRequest[]
  }> {
    return await friendService.getPendingRequests()
  }

  /**
   * 删除好友
   * @param friendId 好友ID
   */
  async removeFriend (friendId: string): Promise<void> {
    return await friendService.removeFriend(friendId)
  }

  /**
   * 更新好友备注
   * @param friendId 好友ID
   * @param remark 备注内容
   */
  async updateFriendRemark (friendId: string, remark: string): Promise<void> {
    return await friendService.updateFriendRemark(friendId, remark)
  }

  /**
   * 设置好友黑名单状态
   * @param friendId 好友ID
   * @param is_blacklist 是否黑名单
   */
  async setFriendBlacklist (friendId: string, is_blacklist: boolean): Promise<void> {
    return await friendService.setFriendBlacklist(friendId, is_blacklist)
  }

  // ============ WebSocket通知发送方法 ============

  /**
   * 发送好友请求的通知消息
   * @param receiver_uid 接收者用户ID
   * @param request 好友请求数据
   * @param apply_text 申请文本
   */
  private async sendFriendRequestMessage (
    receiver_uid: string,
    request: FriendRequest,
    apply_text?: string,
  ): Promise<void> {
    try {
      // 获取当前用户信息
      const currentUserInfo = await this.getCurrentUserInfo()

      // 创建通知详情
      const notificationDetail: FriendNotificationDetail = {
        action: 'friend_request',
        req_id: request.req_id,
        sender_uid: this.userId!,
        receiver_uid,
        apply_text,
        user_info: currentUserInfo,
      }

      // 创建通知消息
      const notificationMessage = new MessageText(MessageType.NOTIFICATION, {
        senderId: this.userId!,
        receiverId: receiver_uid,
        contentType: ContentType.FRIEND,
        detail: JSON.stringify(notificationDetail),
      })

      // 使用现有的sendWithUpdate方法发送消息，这样会通过WebSocket系统发送
      this.sendWithUpdate(notificationMessage)

      devLog('Friend request message sent', {
        req_id: request.req_id,
        receiver_uid,
      })
    } catch (error) {
      console.error('Failed to send friend request message:', error)
    }
  }

  /**
   * 获取当前用户信息
   */
  private async getCurrentUserInfo (): Promise<UserProfile> {
    // TODO: 从API获取用户信息
    throw new Error('用户信息获取API尚未实现')
  }

  /**
   * 发送好友请求响应的通知消息
   * @param req_id 请求ID
   * @param status 响应状态
   */
  private async sendFriendResponseMessage (
    req_id: string,
    status: 'accepted' | 'rejected',
  ): Promise<void> {
    try {
      // 获取请求详情以确定接收者
      const request = await this.getFriendRequestById(req_id)
      if (!request) {
        console.warn('Friend request not found for notification:', req_id)
        return
      }

      // 获取当前用户信息
      const currentUserInfo = await this.getCurrentUserInfo()

      // 创建响应通知详情
      const notificationDetail: FriendNotificationDetail = {
        action: 'friend_response',
        req_id,
        sender_uid: this.userId!,
        receiver_uid: request.sender_uid,
        status,
        user_info: currentUserInfo,
      }

      // 创建通知消息
      const notificationMessage = new MessageText(MessageType.NOTIFICATION, {
        senderId: this.userId!,
        receiverId: request.sender_uid,
        contentType: ContentType.FRIEND,
        detail: JSON.stringify(notificationDetail),
      })

      // 使用sendWithUpdate方法发送消息，这样会通过WebSocket系统发送
      this.sendWithUpdate(notificationMessage)

      devLog('Friend response message sent', {
        req_id,
        status,
        receiver_uid: request.sender_uid,
      })
    } catch (error) {
      console.error('Failed to send friend response message:', error)
    }
  }

  /**
   * 获取好友请求详情（用于通知发送）
   * @param req_id 请求ID
   * @returns 好友请求数据或null
   */
  private async getFriendRequestById (req_id: string): Promise<FriendRequest | null> {
    try {
      // TODO: 从API获取
      // const response = await authApi.get(`/auth/friend/request/${req_id}`);
      // return response.data.request;

      throw new Error('获取请求详情API尚未实现')
    } catch (error) {
      console.error('Failed to get friend request:', error)
      return null
    }
  }
}

export { friendService } from './friendService'
export type { LocalMessage } from './messageTypes'
export const messageService = new MessageService()
