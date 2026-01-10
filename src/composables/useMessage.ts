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
import { useGroupStore } from '@/stores/groupStore'
import { type MessageStoreType, useMessageStore } from '@/stores/messageStore'
import { useUserStore } from '@/stores/userStore'
import { batchApiResponseToLocalMessages, createFileMessage, createTextMessage, LocalMessage, MessageStatus } from '@/types/message'
import { MessageType } from '@/types/websocket'
import type { GroupAnnouncement } from '@/types/group'
import { useChat } from './useChat'
import { useFile } from './useFile'
import { useFriend } from './useFriend'
import { useGroup } from './useGroup'
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
  const { getGroupMembers, getGroupAnnouncements } = useGroup()
  const groupStore = useGroupStore()

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
   * 处理队列中的消息状态，处理超时和重试
   */
  const processQueue = () => {
    const now = Math.ceil(Date.now() / 1000) // 秒级时间戳
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

  // ============== 核心方法 ==============

  /**
   * 发送文本消息（支持 @ 功能）
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
   * @param mentionedUids 被@的用户ID列表（可选）
   */
  const sendTextMessage = async (content: string, mentionedUids?: string[] | null) => {
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
        undefined, // is_announcement
        mentionedUids, // @ 的用户列表
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
   * 发送群公告消息
   *
   * 与 sendTextMessage 的区别：
   * - 只能在群聊中发送
   * - is_announcement 参数设为 true
   * - 需要群主或管理员权限
   *
   * @param content 公告内容
   * @param mentionedUids 被@的用户ID列表（可选）
   */
  const sendAnnouncement = async (content: string, mentionedUids?: string[] | null) => {
    try {
      // 检查是否有激活的聊天
      if (!activeChatId.value) {
        showError('请先选择一个聊天')
        return
      }

      // 只允许群聊发送公告
      if (activeChatType.value !== 'group') {
        showError('只能在群聊中发布公告')
        return
      }

      const chatId = activeChatId.value
      const chatType = 'group'
      const receiverId = chatId // 群聊中 receiver_id 就是 gid

      // 使用 createTextMessage 创建消息，但 is_announcement 设为 true
      const message = createTextMessage(
        MessageType.MESGROUP,
        getCurrentUserId(),
        getCurrentUsername(),
        getCurrentUserAvatar(),
        receiverId,
        content,
        chatId,
        true,
        true, // 关键：is_announcement = true
        mentionedUids,
      )

      // 立即添加到 store（立即显示）
      messageStore.addMessage(chatId, message, chatType)

      // 更新会话最新消息
      const chatStore = useChatStore()
      chatStore.updateChatLastMessage(chatId, content)

      // 手动将公告添加到 groupStore（用于 onlineBoard 显示）
      const announcement: GroupAnnouncement = {
        msg_id: message.payload.message_id || '',
        gid: chatId,
        content,
        sender_uid: getCurrentUserId(),
        send_time: message.payload.timestamp || 0,
        mentioned_uids: mentionedUids || undefined,
      }
      groupStore._addGroupAnnouncementInternal(announcement)

      // 通过 WebSocket 发送
      websocketService.send(message)

      // 发送后将消息引用加入队列，等待ACK确认
      message.sendStatus = MessageStatus.SENDING
      addToQueue(message)
      startQueueProcessing()

      showSuccess('群公告发布成功')
      return message.payload.message_id
    } catch (error) {
      console.error('发送群公告失败:', error)
      showError('群公告发送失败，请重试')
      throw error
    }
  }

  /**
   * 发送文件消息
   *
   * 流程：
   * 1. 上传文件（带进度追踪）
   * 2. 创建文件消息
   * 3. 添加到 messageStore（立即显示）
   * 4. 通过 WebSocket 发送
   * 5. 加入队列等待 ACK
   */
  const sendFileMessage = async (file: File, fileType: 'image' | 'file' = 'file') => {
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

      // 获取上传函数
      const { uploadFile } = useFile()

      // 上传文件
      const uploadResult = await uploadFile(file, {
        fileType,
        onProgress: (progress: number) => {
          console.log(`Upload progress: ${progress}%`)
        },
      })

      // 创建文件消息
      const message = createFileMessage(
        chatType === 'private' ? MessageType.PRIVATE : MessageType.MESGROUP,
        getCurrentUserId(),
        getCurrentUsername(),
        getCurrentUserAvatar(),
        receiverId,
        uploadResult.file_id,
        uploadResult.display_name,
        uploadResult.url || '',
        chatId,
        true,
        uploadResult.file_size,
        uploadResult.mime_type,
      )

      // 添加到 store（立即显示）
      messageStore.addMessage(chatId, message, chatType)

      // 更新会话最新消息
      const chatStore = useChatStore()
      chatStore.updateChatLastMessageFromMessage(chatId, message)

      // 通过 WebSocket 发送
      websocketService.send(message)

      // 加入队列等待 ACK
      if (message.type === 'Private' || message.type === 'MesGroup') {
        message.sendStatus = MessageStatus.SENDING
        addToQueue(message)
        startQueueProcessing()
      }

      return message.payload.message_id
    } catch (error) {
      console.error('发送文件消息失败:', error)
      showError('文件发送失败，请重试')
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

      // 群聊：在加载历史消息之前先加载群成员信息
      // 这样 TextMessage 组件才能正确渲染 @ 高亮
      if (type === 'group') {
        try {
          await getGroupMembers({ gid: chatId }, true)
        } catch (error) {
          console.warn(`加载群聊 ${chatId} 成员失败，继续加载历史消息`, error)
        }
      }

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

        // 群聊：获取已读人数（在添加消息之后）
        if (type === 'group') {
          const myMessages = localMessages.filter(msg => msg.userIsSender && !msg.is_revoked)
          if (myMessages.length > 0) {
            const messageIds = myMessages.map(msg => msg.payload.message_id!).filter(Boolean)
            try {
              const results = await messageService.getGroupReadStatus(chatId, messageIds)
              for (const { messageId, readCount } of results) {
                messageStore.updateMessageReadCount(messageId, readCount, chatId)
              }
            } catch (error) {
              console.error('获取群聊已读人数失败:', error)
            }
          }
        }

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
        const readTimestamp = latestTimestamp || Math.ceil(Date.now() / 1000)

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

  /**
   * 撤回消息
   *
   * @param messageId 消息ID
   * @param chatId 聊天ID
   * @param chatType 聊天类型 'private' | 'group'
   */
  const revokeMessage = async (
    messageId: string,
    chatId: string,
    chatType: 'private' | 'group',
  ) => {
    try {
      await messageService.revokeMessage(messageId, chatId, chatType)
      // 立即更新本地状态（乐观更新）
      messageStore.markMessageAsRevoked(messageId)
      showSuccess('消息已撤回')
    } catch (error) {
      console.error('撤回消息失败:', error)
      showError('撤回失败，请重试')
      throw error
    }
  }

  // ============== 初始化和重置 ==============

  /**
   * 初始化消息模块
   *
   * 执行流程：
   * 1. 从 authStore 获取用户信息
   * 2. 初始化 messageService
   *
   * 注意：WebSocket 事件监听已在 websocketHandler 中注册
   */
  const init = async () => {
    try {
      // 检查用户认证状态
      if (!authStore.isAuthenticated || !authStore.token || !authStore.userId) {
        throw new Error('用户未认证')
      }

      console.log('消息模块初始化成功')
    } catch (error) {
      console.error('消息模块初始化失败:', error)
      showError('消息模块初始化失败')
      throw error
    }
  }

  /**
   * 重置消息模块
   *
   * 执行流程：
   * 1. 清空 messageStore 中的所有数据（包括队列）
   * 2. 停止队列处理定时器
   * 3. 重置本地状态
   */
  const reset = () => {
    try {
      // 清空数据（包括队列）
      messageStore.clearAllMessages()

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
    sendFileMessage,
    sendAnnouncement,
    loadHistoryMessages,
    markAsRead,
    resendMessage,
    revokeMessage,

    // 初始化和重置
    init,
    reset,

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
