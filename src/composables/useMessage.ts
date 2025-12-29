/**
 * useMessage.ts
 *
 * 消息模块的统一门面层
 *
 * 职责：
 * - 统一管理消息相关状态和操作
 * - 提供消息发送、接收、加载等核心功能
 * - 处理消息状态管理和错误反馈
 * - 作为组件层与业务逻辑层之间的桥梁
 *
 * 数据流：
 * 1. 组件调用 useMessage 方法
 * 2. useMessage 调用 messageService 处理业务逻辑
 * 3. messageService 与 WebSocket 通信
 * 4. 消息状态更新到 messageStore
 * 5. 组件响应式获取最新状态
 *
 * 使用场景：
 * - 聊天页面消息收发
 * - 历史消息加载
 * - 消息重试发送
 * - 消息已读状态管理
 */

import { computed, readonly, ref } from 'vue'
import { useSnackbar } from '@/composables/useSnackbar'
import { messageService } from '@/service/messageService'
import { websocketService } from '@/service/websocket'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chatStore'
import { useFriendStore } from '@/stores/friendStore'
import { type MessageStoreType, useMessageStore } from '@/stores/messageStore'
import { useUserStore } from '@/stores/userStore'
import { batchApiResponseToLocalMessages, createTextMessage, LocalMessage, MessageStatus } from '@/types/message'
import { MessageType } from '@/types/websocket'
import { useChat } from './useChat'
import { useFriend } from './useFriend'
import { useUser } from './useUser'

// 防抖函数
function debounce (fn: (...args: any[]) => void, delay: number) {
  let timeoutId: ReturnType<typeof setTimeout>
  return function (...args: any[]) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

export function useMessage () {
  // ============== 响应式状态 ==============

  const messageStore = useMessageStore()
  const authStore = useAuthStore()
  const { showSuccess, showError, showWarning } = useSnackbar()
  const { activeChatId, activeChat, activeChatType } = useChat()
  const { getCurrentUserId, getCurrentUsername, getCurrentUserAvatar } = useUser()
  const { getFriendByFid } = useFriend()

  const isLoading = ref(false)

  // ============== 队列配置 ==============

  const queueConfig = {
    timeout: 5000, // ACK超时时间
    retryInterval: 1000, // 重试间隔
    maxRetries: 3, // 最大重试次数
  }

  // ============== 计算属性 ==============

  /**
   * 获取当前聊天的消息列表
   * 响应式更新，自动同步 messageStore 中的最新数据
   */
  const messages = computed(() => {
    if (!activeChatId.value) {
      return []
    }
    const chatType = activeChatType.value === 'private' ? 'private' : 'group'
    return messageStore.getMessages(activeChatId.value, chatType)
  })

  /**
   * 是否还有更多历史消息可以加载
   */
  const hasMore = computed(() => {
    if (!activeChatId.value) {
      return false
    }
    return messageStore.hasMoreMessages(activeChatId.value)
  })

  /**
   * 当前聊天是否正在加载
   */
  const loading = computed(() => {
    if (!activeChatId.value) {
      return false
    }
    return messageStore.isLoading(activeChatId.value)
  })

  // ============== 队列管理方法（使用 store 提供的方法）=============

  /**
   * 将已发送消息引用加入队列
   */
  const addToQueue = (message: LocalMessage) => {
    messageStore.addToMessageQueue(message)
  }

  /**
   * 从队列移除消息引用
   */
  const removeFromQueue = (messageId: string) => {
    messageStore.removeFromMessageQueue(messageId)
  }

  /**
   * 查找队列中的消息引用
   */
  const findInQueue = (messageId: string): LocalMessage | undefined => {
    return messageStore.findInMessageQueue(messageId)
  }

  /**
   * 处理队列中的消息状态，处理超时和重试
   */
  const processQueue = () => {
    const now = Math.floor(Date.now() / 1000) // 秒级时间戳
    const queueMessages = messageStore.getQueueMessages()

    for (const message of queueMessages) {
      if (message.sendStatus === MessageStatus.SENDING) {
        const timestamp = message.payload.timestamp
        if (timestamp && now - timestamp > queueConfig.timeout / 1000) {
          // 超时重试（timeout 是毫秒，需要转为秒）
          const currentRetries = message.retryCount || 0

          if (currentRetries >= queueConfig.maxRetries) {
            // 达到最大重试次数，标记为失败
            message.sendStatus = MessageStatus.FAILED
            console.warn(`消息${message.payload.message_id}重试${currentRetries}次后仍然失败`)
          } else {
            // 继续重试
            try {
              websocketService.send(message)
              message.payload.timestamp = now
              message.retryCount = currentRetries + 1
              console.log(`消息${message.payload.message_id}第${message.retryCount}次重试`)
            } catch {
              message.sendStatus = MessageStatus.FAILED
            }
          }
        }
      }
    }

    // 清理失败和非发送中的消息
    messageStore.filterMessageQueue(msg => msg.sendStatus === MessageStatus.SENDING)
  }

  /**
   * 启动队列处理定时器
   */
  const startQueueProcessing = () => {
    if (messageStore.queueProcessingTimer) {
      return
    }

    messageStore.queueProcessingTimer = setInterval(() => {
      processQueue()
    }, queueConfig.retryInterval) as unknown as number
  }

  /**
   * 停止队列处理
   */
  const stopQueueProcessing = () => {
    if (messageStore.queueProcessingTimer) {
      clearInterval(messageStore.queueProcessingTimer)
      messageStore.queueProcessingTimer = undefined
    }
  }

  // ============== 辅助方法 ==============

  /**
   * 获取接收者ID
   *
   * @param chatId 聊天ID
   * @param type 聊天类型
   * @returns 接收者ID（群聊为gid，私聊为对方uid）
   */
  const getReceiverId = (chatId: string, type: MessageStoreType): string => {
    if (type === 'group') {
      // 群聊：receiver_id 就是 gid
      return chatId
    } else {
      // 私聊：receiver_id 是对方的 uid
      // chatId 在私聊中就是 fid (friend id)
      const friend = getFriendByFid(chatId)
      return friend?.id || '0'
    }
  }

  /**
   * 格式化消息内容用于显示在会话列表
   *
   * @param message 本地消息对象
   * @returns 格式化后的消息内容
   */
  const formatMessageContent = (message: LocalMessage): string => {
    const contentType = message.payload.content_type

    switch (contentType) {
      case 'text': {
        return message.payload.detail || ''
      }
      case 'image': {
        return '[图片]'
      }
      case 'file': {
        return '[文件]'
      }
      case 'voice': {
        return '[语音]'
      }
      case 'video': {
        return '[视频]'
      }
      case 'system': {
        return '[系统消息]'
      }
      default: {
        return message.payload.detail || '[消息]'
      }
    }
  }

  // ============== 核心方法 ==============

  /**
   * 发送文本消息
   *
   * 执行流程：
   * 1. 生成临时消息ID
   * 2. 创建 LocalMessage 对象
   * 3. 设置发送状态为 PENDING
   * 4. 添加到 messageStore（立即显示在UI上）
   * 5. 调用 messageService 发送
   * 6. 更新发送状态为 SENDING 或 FAILED
   *
   * @param content 消息内容
   */
  const sendTextMessage = async (content: string) => {
    try {
      // 检查是否有激活的聊天
      if (!activeChatId.value) {
        showError('请先选择一个聊天')
        return
      }

      // 获取当前聊天信息
      const chatId = activeChatId.value
      const chatType = activeChatType.value === 'private' ? 'private' : 'group'
      const receiverId = getReceiverId(chatId, chatType)

      // 2. 使用 createTextMessage 函数创建消息对象
      const message = createTextMessage(
        chatType === 'private' ? MessageType.PRIVATE : MessageType.MESGROUP,
        getCurrentUserId(),
        getCurrentUsername(),
        getCurrentUserAvatar(),
        receiverId,
        content,
        chatId,
        true,
      )

      // 3. 立即添加到 store（立即显示）
      messageStore.addMessage(chatId, message, chatType)

      // 3.5 更新会话最新消息
      const chatStore = useChatStore()
      chatStore.updateChatLastMessage(chatId, content)

      // 4. 通过 WebSocket 发送
      websocketService.send(message)

      // 5. 发送后将消息引用加入队列，等待ACK确认
      if (message.type === 'Private' || message.type === 'MesGroup') {
        message.sendStatus = MessageStatus.SENDING
        addToQueue(message) // 添加的是同一个对象引用
        startQueueProcessing() // 启动队列处理
      }

      return message.payload.message_id
    } catch (error) {
      console.error('发送消息失败:', error)
      // 如果发送失败，将消息状态设置为FAILED
      if (error instanceof Error && error.message.includes('WebSocket未连接')) {
        // 连接断开的情况，将消息加入队列等待重发
        const message = messageStore.getLastMessage(activeChatId.value!, activeChatType.value === 'private' ? 'private' : 'group')
        if (message) {
          message.sendStatus = MessageStatus.PENDING
          addToQueue(message)
        }
      }
      showError('消息发送失败，请重试')
      throw error
    }
  }

  /**
   * 加载历史消息
   *
   * 执行流程：
   * 1. 检查是否已加载或正在加载
   * 2. 设置加载状态
   * 3. 调用 messageService 获取历史消息（使用分页）
   * 4. 将消息添加到 messageStore（按时间戳排序）
   * 5. 更新分页信息
   * 6. 清除加载状态
   *
   * @param chatId 聊天ID
   * @param type 消息类型
   * @param loadMore 是否加载更多（true=向上加载历史，false=首次加载）
   */
  const loadHistoryMessages = async (
    chatId: string,
    type: MessageStoreType,
    loadMore = false,
  ) => {
    try {
      // 检查历史是否已完整加载
      if (!loadMore && messageStore.getHistoryFullyLoaded(chatId)) {
        console.log(`聊天 ${chatId} 历史已完整加载，跳过首次加载`)
        return
      }

      // 检查是否正在加载
      if (messageStore.isLoading(chatId)) {
        console.log('正在加载中，跳过重复请求')
        return
      }

      // 检查是否还有更多消息可加载
      // 后续可以返回hasMore作为提示
      if (loadMore && !messageStore.hasMoreMessages(chatId)) {
        console.log('没有更多历史消息了')
        return
      }

      // 设置加载状态
      messageStore.setLoading(chatId, true)

      // 获取当前分页信息
      const currentPagination = messageStore.getPagination(chatId)
      const currentPage = currentPagination?.page || 0
      const pageSize = currentPagination?.pageSize || 20

      // 后端的offset实际上是page（页码），从0开始
      // 首次加载：page=0，加载更多：page=currentPage
      const offset = loadMore ? currentPage : 0

      // 调用服务层获取历史消息
      const result = type === 'private'
        ? await messageService.fetchHistoryPrivateMessages(chatId, pageSize, offset)
        : await messageService.fetchHistoryGroupMessages(chatId, pageSize, offset)

      // 将获取到的消息转换为 LocalMessage
      const localMessages = batchApiResponseToLocalMessages(result.messages, authStore.userId)

      // 使用后端返回的分页信息判断是否还有更多
      // 后端 totalPages 从 1 开始，currentPage 从 0 开始
      // 例如：totalPages=2，currentPage 可能是 0 或 1
      // 当 currentPage + 1 < totalPages 时，说明还有更多页
      const hasMoreMessages = result.currentPage + 1 < result.totalPages

      // 按时间戳排序（旧消息在前，新消息在后）
      localMessages.sort((a, b) =>
        (a.payload.timestamp || 0) - (b.payload.timestamp || 0),
      )

      // 将消息添加到 store
      if (localMessages.length > 0) {
        // 使用 addHistoryMessages 方法，支持 prepend 参数
        messageStore.addHistoryMessages(chatId, localMessages, type, loadMore)

        // 更新分页信息
        messageStore.updatePagination(chatId, {
          page: currentPage + 1,
          pageSize,
          hasMore: hasMoreMessages,
          oldestMessageId: localMessages[0]?.payload.message_id,
          newestMessageId: localMessages[localMessages.length - 1]?.payload.message_id,
        })

        // 首次加载且没有更多消息时，标记为已完整加载
        if (!loadMore && !hasMoreMessages) {
          messageStore.setHistoryFullyLoaded(chatId, true)
          console.log(`聊天 ${chatId} 历史加载完成，已标记为完整加载`)
        }

        console.log(`成功加载${type}聊天${chatId}的${localMessages.length}条历史消息（第${currentPage + 1}页，总页数: ${result.totalPages}，当前页: ${result.currentPage}，hasMore: ${hasMoreMessages}）`)
      } else {
        // 没有更多消息了
        messageStore.updatePagination(chatId, {
          page: currentPage,
          hasMore: false,
        })

        // 首次加载且没有消息时也标记为已完整加载
        if (!loadMore) {
          messageStore.setHistoryFullyLoaded(chatId, true)
          console.log(`聊天 ${chatId} 没有历史消息，标记为完整加载`)
        }

        console.log(`${type}聊天${chatId}没有更多历史消息`)
      }
    } catch (error) {
      console.error('加载历史消息失败:', error)
      showError('加载历史消息失败')
      throw error
    } finally {
      // 清除加载状态
      messageStore.setLoading(chatId, false)
    }
  }

  /**
   * 标记消息为已读（防抖）
   *
   * 执行流程：
   * 1. 使用防抖，避免频繁调用
   * 2. 收集需要标记为已读的消息
   * 3. 调用 messageService API 发送已读标记
   * 4. 更新本地状态
   * 5. 更新 chatStore 未读数
   *
   * @param chatId 聊天ID
   * @param beforeTimestamp 标记此时间戳之前的消息为已读
   */
  const markAsRead = debounce(
    async (chatId: string, beforeTimestamp?: number) => {
      try {
        if (!chatId) {
          return
        }

        // 获取需要标记的消息
        const chatType = activeChatType.value === 'private' ? 'private' : 'group'
        const messages = messageStore.getMessages(chatId, chatType)
        const messageIds: string[] = []
        let latestTimestamp = 0

        for (const message of messages) {
          // 只标记接收到的未读消息
          if (!message.userIsSender && !message.is_read) {
            const msgTimestamp = message.payload.timestamp || 0
            if (!beforeTimestamp || msgTimestamp <= beforeTimestamp) {
              messageIds.push(message.payload.message_id!)
              // 记录最新的时间戳，用于API调用
              if (msgTimestamp > latestTimestamp) {
                latestTimestamp = msgTimestamp
              }
            }
          }
        }

        if (messageIds.length === 0) {
          console.log(`聊天${chatId}没有需要标记已读的消息`)
          return
        }

        // 使用当前时间戳作为已读标记时间（秒级，如果有消息则使用消息的最新时间戳）
        const readTimestamp = latestTimestamp || Math.floor(Date.now() / 1000)

        // 调用 messageService API 发送已读标记
        await messageService.markMessagesAsRead(
          chatId,
          chatType,
          readTimestamp,
        )

        // 更新本地状态 - 传递类型参数以提升查找性能
        messageStore.markMessagesAsRead(chatId, messageIds, chatType)

        console.log(`成功标记聊天${chatId}的${messageIds.length}条消息为已读（时间戳: ${readTimestamp}）`)
      } catch (error) {
        console.error('标记已读失败:', error)
        showError('标记消息已读失败')
        throw error
      }
    },
    500, // 500ms 防抖
  )

  /**
   * 重新发送消息
   *
   * 执行流程：
   * 1. 根据 messageId 查找消息
   * 2. 检查消息状态（只能重试失败的消息）
   * 3. 重置消息状态为 PENDING
   * 4. 通过 WebSocket 重新发送消息
   * 5. 返回消息ID
   *
   * @param messageId 消息ID
   */
  const resendMessage = async (messageId: string) => {
    try {
      // 查找消息 - 优化：在当前聊天中查找
      const chatType = activeChatType.value === 'private' ? 'private' : 'group'
      let message = messageStore.getMessageById(
        messageId,
        chatType,
        activeChatId.value,
      )

      // 如果在当前聊天中没找到，再全局搜索
      if (!message) {
        message = messageStore.getMessageById(messageId)
        if (!message) {
          showWarning('消息不存在')
          return
        }
      }

      // 检查状态
      if (message.sendStatus !== MessageStatus.FAILED) {
        showWarning('只能重试发送失败的消息')
        return
      }

      // 重置状态为 PENDING 和重试次数
      message.sendStatus = MessageStatus.PENDING
      message.retryCount = 0

      // 通过 WebSocket 重新发送
      websocketService.send(message)

      // 发送成功后加入队列等待ACK
      addToQueue(message)
      startQueueProcessing()

      showSuccess('消息重新发送中...')

      return message.payload.message_id
    } catch (error) {
      console.error('重发消息失败:', error)
      // 发送失败，重置状态为 FAILED
      messageStore.updateMessageStatus(messageId, MessageStatus.FAILED)
      showError('重发失败，请检查网络连接')
      throw error
    }
  }

  // ============== 消息接收处理 ==============

  /**
   * 处理接收到的WebSocket消息
   *
   * 执行流程：
   * 1. 解析消息类型
   * 2. 转换为 LocalMessage
   * 3. 根据消息类型分发处理
   * 4. 更新到 messageStore
   * 5. 触发UI更新
   *
   * @param wsMessage WebSocket接收到的消息
   */
  const handleIncomingMessage = (wsMessage: any) => {
    try {
      // 转换为 LocalMessage
      const localMessage = new LocalMessage(
        wsMessage.type,
        wsMessage.payload || {},
        MessageStatus.SENT,
        wsMessage.payload?.sender_id === authStore.userId,
      )

      // 根据消息类型添加到对应的 store
      let storeType: MessageStoreType
      switch (localMessage.type) {
        case MessageType.PRIVATE: {
          storeType = 'private'
          break
        }
        case MessageType.MESGROUP: {
          storeType = 'group'
          break
        }
        default: {
          console.warn('未知消息类型:', localMessage.type)
          return
        }
      }

      // 判断是否为当前用户发送
      localMessage.userIsSender = localMessage.payload.sender_id === authStore.userId

      // 过滤自己发送的消息（避免重复添加）
      // 发送消息时已经添加到store了，不需要再添加广播回来的消息
      if (localMessage.userIsSender) {
        console.log(`[消息] 忽略自己发送的广播消息: ${localMessage.payload.message_id}`)
        return
      }

      // 只添加别人发送的消息
      if (localMessage.payload.chat_id) {
        messageStore.addMessage(localMessage.payload.chat_id, localMessage, storeType)

        // 更新 chatStore
        const chatStore = useChatStore()

        // 1. 更新会话最新消息
        const messageContent = formatMessageContent(localMessage)
        chatStore.updateChatLastMessage(localMessage.payload.chat_id, messageContent)

        // 2. 增加未读数（仅当不是当前激活的会话时）
        if (activeChatId.value !== localMessage.payload.chat_id) {
          chatStore.incrementUnreadCount(localMessage.payload.chat_id)
        }
      }

      console.log(`[消息] 收到${storeType}消息:`, localMessage.payload)
    } catch (error) {
      console.error('处理接收消息失败:', error)
    }
  }

  /**
   * 处理消息确认（ACK）
   *
   * 执行流程：
   * 1. 解析ACK数据
   * 2. 根据 messageId 查找对应消息
   * 3. 更新消息状态为 SENT
   * 4. 记录发送时间
   *
   * @param ackData ACK确认数据
   */
  const handleMessageAck = (ackData: any) => {
    try {
      const { tempId, realId } = ackData
      const queueMessages = messageStore.getQueueMessages()
      console.log('收到ACK:', { tempId, realId, queueSize: queueMessages.length })
      console.log('队列中的消息IDs:', queueMessages.map(m => m.payload.message_id))

      // 从队列中查找并处理消息
      const queuedMessage = findInQueue(tempId)
      if (queuedMessage) {
        // 直接修改对象属性，messageStore中的状态自动更新
        if (realId) {
          queuedMessage.payload.message_id = realId
        }
        queuedMessage.sendStatus = MessageStatus.SENT
        removeFromQueue(tempId)
        console.log(`消息${tempId}发送成功`)
      } else {
        console.warn('收到未知消息的ACK:', tempId, 'realId:', realId)
      }
    } catch (error) {
      console.error('处理消息ACK失败:', error)
    }
  }

  // ============== 初始化和重置 ==============

  /**
   * 初始化消息模块
   *
   * 执行流程：
   * 1. 从 authStore 获取用户信息
   * 2. 初始化 messageService
   * 3. 设置 WebSocket 事件监听
   * 4. 加载初始数据（如通知消息）
   */
  const init = async () => {
    try {
      // 检查用户认证状态
      if (!authStore.isAuthenticated || !authStore.token || !authStore.userId) {
        throw new Error('用户未认证')
      }

      // 设置 WebSocket 事件监听
      setupWebSocketListeners()

      console.log('消息模块初始化成功')
    } catch (error) {
      console.error('消息模块初始化失败:', error)
      showError('消息模块初始化失败')

      // 初始化失败时自动清理已注册的事件监听器
      cleanupWebSocketListeners()

      throw error
    }
  }

  /**
   * 设置 WebSocket 事件监听
   */
  const setupWebSocketListeners = () => {
    // 先清理可能存在的旧监听器，防止重复注册
    cleanupWebSocketListeners()

    // 监听消息接收
    websocketService.on('message', handleIncomingMessage)

    // 监听消息ACK
    websocketService.on('messageAck', handleMessageAck)

    // 监听连接状态变化
    websocketService.on('connected', () => {
      console.log('WebSocket已连接')
      showSuccess('连接成功')
      // 连接恢复，重新发送队列中的消息
      const queueMessages = messageStore.getQueueMessages()
      if (queueMessages.length > 0) {
        queueMessages.forEach((message: LocalMessage) => {
          // 重发所有未成功发送的消息（PENDING 和 FAILED）
          if (message.sendStatus === MessageStatus.PENDING
            || message.sendStatus === MessageStatus.FAILED) {
            try {
              websocketService.send(message)
              message.sendStatus = MessageStatus.SENDING
              message.retryCount = 0 // 连接恢复后重置重试计数
            } catch {
              console.error('重发消息失败')
            }
          }
        })
      }
    })

    websocketService.on('disconnected', () => {
      console.log('WebSocket已断开')
      showWarning('连接已断开')
    })

    websocketService.on('error', (error: any) => {
      console.error('WebSocket错误:', error)
      showError('连接错误')
    })

    console.log('WebSocket事件监听器已设置')
  }

  /**
   * 清理 WebSocket 事件监听
   *
   * 负责清理 useMessage 模块注册的所有 WebSocket 事件监听器
   */
  const cleanupWebSocketListeners = () => {
    try {
      // 移除所有注册的事件监听器
      websocketService.off('message', handleIncomingMessage)
      websocketService.off('messageAck', handleMessageAck)
      websocketService.off('connected')
      websocketService.off('disconnected')
      websocketService.off('error')

      console.log('WebSocket事件监听器已清理')
    } catch (error) {
      console.error('清理WebSocket事件监听器失败:', error)
    }
  }

  /**
   * 重置消息模块
   *
   * 执行流程：
   * 1. 清空 messageStore 中的所有数据（包括队列）
   * 2. 清理 WebSocket 事件监听
   * 3. 停止队列处理定时器
   * 4. 重置本地状态
   */
  const reset = () => {
    try {
      // 清空数据（包括队列）
      messageStore.clearAllMessages()

      // 清理所有监听器
      cleanupWebSocketListeners()

      // 停止队列处理定时器
      stopQueueProcessing()

      // 重置本地状态
      isLoading.value = false

      console.log('消息模块已重置')
    } catch (error) {
      console.error('重置消息模块失败:', error)
    }
  }

  /**
   * 标记当前聊天为已读
   */
  const markCurrentChatAsRead = () => {
    if (activeChatId.value) {
      markAsRead(activeChatId.value)
    }
  }

  /**
   * 对当前聊天的消息按时间戳排序
   */
  const sortCurrentChatMessages = () => {
    if (activeChatId.value && activeChatType.value) {
      const chatType = activeChatType.value === 'private' ? 'private' : 'group'
      messageStore.sortMessagesByTimestamp(activeChatId.value, chatType)
    }
  }

  // ============== 返回值 ==============

  return {
    // 响应式状态
    messages,
    isLoading,
    hasMore,
    loading,

    // 核心方法
    sendTextMessage,
    loadHistoryMessages,
    markAsRead,
    resendMessage,

    // 消息处理
    handleIncomingMessage,
    handleMessageAck,

    // 初始化和重置
    init,
    reset,
    cleanupWebSocketListeners,

    // 辅助方法
    markCurrentChatAsRead,
    sortCurrentChatMessages,

    // 队列管理（高级用法）- 直接从 store 访问
    startQueueProcessing,
    stopQueueProcessing,

    // Store 访问（高级用法）
    messageStore,
    messageService,
  }
}
