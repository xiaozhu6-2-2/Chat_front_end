/**
 * Message Store
 * 管理所有消息数据的状态存储
 *
 * 职责：
 * - 存储和管理所有类型的消息（私聊、群聊）
 * - 管理消息分页数据
 * - 管理消息加载状态
 * - 提供消息操作的统一接口
 *
 * 注意：本 store 只负责消息数据的状态管理，不处理 WebSocket 连接和消息发送
 */

import type { LocalMessage, MessageStatus } from '@/types/message'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

/**
 * 分页信息接口
 */
export interface PaginationInfo {
  hasMore: boolean // 是否有更多消息
  page: number // 当前页码
  pageSize: number // 每页大小
  totalCount?: number // 总消息数（可选）
  oldestMessageId?: string // 当前最早消息的ID（用于分页查询）
  newestMessageId?: string // 当前最新消息的ID（用于增量更新）
}

/**
 * 消息类型标识
 */
export type MessageStoreType = 'private' | 'group'

export const useMessageStore = defineStore('message', () => {
  // ============== State ==============

  // 私聊消息存储：chatId -> 消息列表
  const privateMessages = ref<Map<string, LocalMessage[]>>(new Map())

  // 群聊消息存储：chatId -> 消息列表
  const groupMessages = ref<Map<string, LocalMessage[]>>(new Map())

  // 分页信息存储：chatId -> PaginationInfo
  const pagination = ref<Map<string, PaginationInfo>>(new Map())

  // 加载状态存储：chatId -> 是否正在加载
  const loadingStates = ref<Map<string, boolean>>(new Map())

  // 历史消息「已完整加载」标记存储：chatId -> boolean
  const historyFullyLoaded = ref<Map<string, boolean>>(new Map())

  // 消息发送队列 - 存储已发送但未收到 ACK 的消息
  const messageQueue = ref<LocalMessage[]>([])

  // 队列处理定时器
  const queueProcessingTimer = ref<number | undefined>(undefined)

  // ============== Getters ==============

  /**
   * 根据聊天ID和类型获取消息列表
   */
  const getMessages = computed(() => {
    return (chatId: string, type: MessageStoreType): LocalMessage[] => {
      switch (type) {
        case 'private': {
          return privateMessages.value.get(chatId) || []
        }
        case 'group': {
          return groupMessages.value.get(chatId) || []
        }
        default: {
          return []
        }
      }
    }
  })

  /**
   * 根据消息ID查找消息
   * @param messageId 消息ID
   * @param type 可选，消息类型，指定后可缩小查找范围
   * @param chatId 可选，聊天ID，指定后可进一步缩小查找范围
   */
  const getMessageById = computed(() => {
    return (messageId: string, type?: MessageStoreType, chatId?: string): LocalMessage | null => {
      // 如果指定了类型，只在特定类型中搜索
      if (type) {
        const messageMap = getMessageMap(type)

        // 如果还指定了chatId，只在特定聊天中搜索
        if (chatId) {
          const messages = messageMap.get(chatId)
          if (messages) {
            return messages.find(m => m.payload.message_id === messageId) || null
          }
          return null
        }

        // 在指定类型的所有聊天中搜索
        for (const messages of messageMap.values()) {
          const message = messages.find(m => m.payload.message_id === messageId)
          if (message) {
            return message
          }
        }

        return null
      }

      // 未指定类型，在所有消息类型中搜索（保持原有逻辑）
      const allMaps = [
        privateMessages.value,
        groupMessages.value,
      ]

      for (const map of allMaps) {
        for (const messages of map.values()) {
          const message = messages.find(m => m.payload.message_id === messageId)
          if (message) {
            return message
          }
        }
      }

      return null
    }
  })

  /**
   * 检查是否还有更多消息可以加载
   */
  const hasMoreMessages = computed(() => {
    return (chatId: string): boolean => {
      const paginationInfo = pagination.value.get(chatId)
      return paginationInfo?.hasMore || false
    }
  })

  /**
   * 检查指定聊天是否正在加载
   */
  const isLoading = computed(() => {
    return (chatId: string): boolean => {
      return loadingStates.value.get(chatId) || false
    }
  })

  /**
   * 获取分页信息
   */
  const getPagination = computed(() => {
    return (chatId: string): PaginationInfo | undefined => {
      return pagination.value.get(chatId)
    }
  })

  /**
   * 检查指定聊天历史是否已完整加载
   */
  const isHistoryFullyLoaded = computed(() => {
    return (chatId: string): boolean => {
      return historyFullyLoaded.value.get(chatId) || false
    }
  })

  /**
   * 获取指定聊天的最新消息
   * 计划用在Chat获取最新消息
   */
  const getLastMessage = computed(() => {
    return (chatId: string, type: MessageStoreType): LocalMessage | null => {
      const messages = getMessages.value(chatId, type)
      return messages.length > 0 ? messages.at(-1) ?? null : null
    }
  })

  // ============== 队列管理 Getters ==============

  /**
   * 获取队列长度
   */
  const queueLength = computed(() => {
    return messageQueue.value.length
  })

  /**
   * 检查队列中是否有指定消息
   */
  const hasMessageInQueue = computed(() => {
    return (messageId: string): boolean => {
      return messageQueue.value.some(m => m.payload.message_id === messageId)
    }
  })

  // ============== Actions ==============

  /**
   * 获取对应的消息Map
   */
  const getMessageMap = (type: MessageStoreType): Map<string, LocalMessage[]> => {
    switch (type) {
      case 'private': {
        return privateMessages.value
      }
      case 'group': {
        return groupMessages.value
      }
      default: {
        return new Map()
      }
    }
  }

  // ============== 队列管理 Actions ==============

  /**
   * 将消息添加到队列（存储同一个对象引用）
   * @param message 要添加的消息对象
   */
  const addToMessageQueue = (message: LocalMessage) => {
    if (message.retryCount === undefined) {
      message.retryCount = 0
    }
    messageQueue.value.push(message)
    console.log('messageStore: 添加消息到队列', message.payload.message_id, '队列长度:', messageQueue.value.length)
  }

  /**
   * 从队列中移除消息
   * @param messageId 消息ID
   */
  const removeFromMessageQueue = (messageId: string) => {
    const index = messageQueue.value.findIndex(m => m.payload.message_id === messageId)
    if (index !== -1) {
      messageQueue.value.splice(index, 1)
      console.log('messageStore: 从队列移除消息', messageId)
    }
  }

  /**
   * 在队列中查找消息
   * @param messageId 消息ID
   * @returns 消息对象或 undefined
   */
  const findInMessageQueue = (messageId: string): LocalMessage | undefined => {
    return messageQueue.value.find(m => m.payload.message_id === messageId)
  }

  /**
   * 清空消息队列
   */
  const clearMessageQueue = () => {
    const queueLength = messageQueue.value.length
    if (queueLength > 0) {
      console.log('messageStore: 清空消息队列，共', queueLength, '条消息')
    }
    messageQueue.value = []
  }

  /**
   * 获取队列中的所有消息（只读）
   */
  const getQueueMessages = (): LocalMessage[] => {
    return messageQueue.value
  }

  /**
   * 过滤队列中的消息（用于 processQueue 清理失败消息）
   * @param predicate 过滤条件函数
   */
  const filterMessageQueue = (predicate: (msg: LocalMessage) => boolean) => {
    messageQueue.value = messageQueue.value.filter(predicate)
  }

  /**
   * 添加单条消息
   * @param chatId 聊天ID
   * @param message 消息对象
   * @param type 消息类型
   */
  const addMessage = (chatId: string, message: LocalMessage, type: MessageStoreType) => {
    const messageMap = getMessageMap(type)

    // 获取现有消息列表，如果没有则创建新数组
    const messages = messageMap.get(chatId) || []

    // 检查消息是否已存在（防止重复）
    const existingIndex = messages.findIndex(m => m.payload.message_id === message.payload.message_id)
    if (existingIndex === -1) {
      // 添加新消息（按时间戳排序插入）
      const msgTimestamp = message.payload.timestamp || 0

      // 快速路径：如果消息列表为空或新消息是最新的，直接添加到末尾
      if (messages.length === 0) {
        messages.push(message)
      } else {
        const lastMessage = messages.at(-1)
        const lastTimestamp = lastMessage?.payload?.timestamp || 0

        if (lastTimestamp <= msgTimestamp) {
          // 新消息是最新的，直接 push（性能最优）
          messages.push(message)
        } else {
          // 需要查找插入位置（较少见的情况）
          let insertIndex = 0
          for (let i = messages.length - 1; i >= 0; i--) {
            const existingMessage = messages[i]
            if (existingMessage?.payload) {
              const existingTimestamp = existingMessage.payload.timestamp || 0
              if (existingTimestamp <= msgTimestamp) {
                insertIndex = i + 1
                break
              }
            }
          }
          messages.splice(insertIndex, 0, message)
        }
      }
      messageMap.set(chatId, messages)

      console.log(`messageStore: 添加新消息到 ${type} 聊天 ${chatId}`)
    } else {
      // 更新现有消息
      messages[existingIndex] = message
      console.log(`messageStore: 更新已存在的消息 ${message.payload.message_id}`)
    }
  }

  /**
   * 更新消息
   * @param messageId 消息ID
   * @param updates 更新的字段
   */
  const updateMessage = (messageId: string, updates: Partial<LocalMessage>) => {
    const message = getMessageById.value(messageId)
    if (message) {
      Object.assign(message, updates)
      console.log(`messageStore: 更新消息 ${messageId}`)
    } else {
      console.warn(`messageStore: 未找到消息 ${messageId}`)
    }
  }

  /**
   * 批量添加历史消息
   * @param chatId 聊天ID
   * @param messages 消息列表
   * @param type 消息类型
   * @param prepend 是否添加到开头（用于加载历史消息）
   */
  const addHistoryMessages = (
    chatId: string,
    messages: LocalMessage[],
    type: MessageStoreType,
    prepend = false,
  ) => {
    const messageMap = getMessageMap(type)
    const existingMessages = messageMap.get(chatId) || []

    // 过滤掉重复的消息
    const uniqueMessages = messages.filter(msg =>
      !existingMessages.some(existing => existing.payload.message_id === msg.payload.message_id),
    )

    if (uniqueMessages.length === 0) {
      console.log(`messageStore: 没有新消息需要添加到 ${type} 聊天 ${chatId}`)
      return
    }

    if (prepend) {
      // 添加到开头（历史消息）
      messageMap.set(chatId, [...uniqueMessages, ...existingMessages])
      console.log(`messageStore: 添加 ${uniqueMessages.length} 条历史消息到 ${type} 聊天 ${chatId}`)
    } else {
      // 添加到末尾（新消息）
      messageMap.set(chatId, [...existingMessages, ...uniqueMessages])
      console.log(`messageStore: 添加 ${uniqueMessages.length} 条新消息到 ${type} 聊天 ${chatId}`)
    }
  }

  /**
   * 更新消息状态
   * @param messageId 消息ID
   * @param status 新状态
   */
  const updateMessageStatus = (messageId: string, status: MessageStatus) => {
    const message = getMessageById.value(messageId)
    if (message) {
      message.sendStatus = status
      console.log(`messageStore: 更新消息 ${messageId} 状态为 ${status}`)
    } else {
      console.warn(`messageStore: 未找到消息 ${messageId}`)
    }
  }

  /**
   * 对指定聊天的消息按时间戳排序
   * @param chatId 聊天ID
   * @param type 消息类型
   */
  const sortMessagesByTimestamp = (chatId: string, type: MessageStoreType) => {
    const messageMap = getMessageMap(type)
    const messages = messageMap.get(chatId)

    if (messages && messages.length > 0) {
      messages.sort((a, b) => (a.payload.timestamp || 0) - (b.payload.timestamp || 0))
      messageMap.set(chatId, messages)
      console.log(`messageStore: 已对 ${type} 聊天 ${chatId} 的 ${messages.length} 条消息按时间戳排序`)
    }
  }

  /**
   * 标记消息为已读
   * @param chatId 聊天ID
   * @param messageIds 消息ID列表（可选，不传则标记所有未读消息）
   */
  const markMessagesAsRead = (chatId: string, messageIds?: string[], type?: MessageStoreType) => {
    if (messageIds) {
      // 标记指定消息为已读
      for (const messageId of messageIds) {
        // 如果知道类型，在特定聊天中查找，否则全局搜索
        const message = type
          ? getMessageById.value(messageId, type, chatId)
          : getMessageById.value(messageId)

        if (message && !message.userIsSender) {
          message.is_read = true
        }
      }
    } else {
      // 标记该聊天的所有消息为已读
      const allMaps = [
        privateMessages.value,
        groupMessages.value,
      ]

      for (const map of allMaps) {
        const messages = map.get(chatId)
        if (messages) {
          for (const message of messages) {
            if (!message.userIsSender) {
              message.is_read = true
            }
          }
        }
      }
    }

    console.log(`messageStore: 标记聊天 ${chatId} 的消息为已读`)
  }

  /**
   * 更新分页信息
   * @param chatId 聊天ID
   * @param paginationInfo 分页信息
   */
  const updatePagination = (chatId: string, paginationInfo: Partial<PaginationInfo>) => {
    const current = pagination.value.get(chatId) || {
      hasMore: true,
      page: 0,
      pageSize: 20,
    }

    pagination.value.set(chatId, {
      ...current,
      ...paginationInfo,
    })

    console.log(`messageStore: 更新聊天 ${chatId} 的分页信息`)
  }

  /**
   * 设置加载状态
   * @param chatId 聊天ID
   * @param isLoading 是否正在加载
   */
  const setLoading = (chatId: string, isLoading: boolean) => {
    loadingStates.value.set(chatId, isLoading)
    console.log(`messageStore: 设置聊天 ${chatId} 加载状态为 ${isLoading}`)
  }

  /**
   * 设置历史已完整加载状态
   * @param chatId 聊天ID
   * @param fullyLoaded 是否已完整加载历史
   */
  const setHistoryFullyLoaded = (chatId: string, fullyLoaded: boolean) => {
    historyFullyLoaded.value.set(chatId, fullyLoaded)
    console.log(`messageStore: 设置聊天 ${chatId} 历史加载完成状态为 ${fullyLoaded}`)
  }

  /**
   * 获取历史已完整加载状态（非 computed 版本，内部使用）
   * @param chatId 聊天ID
   */
  const getHistoryFullyLoaded = (chatId: string): boolean => {
    return historyFullyLoaded.value.get(chatId) || false
  }

  /**
   * 清空指定聊天的消息
   * @param chatId 聊天ID
   * @param type 消息类型（可选，不传则清空所有类型）
   */
  const clearMessages = (chatId: string, type?: MessageStoreType) => {
    // 先清理队列中该聊天的消息
    const initialQueueLength = messageQueue.value.length
    messageQueue.value = messageQueue.value.filter(m => {
      if (m.payload.chat_id === chatId) {
        console.log(`messageStore: 从队列中清理 ${chatId} 的消息 ${m.payload.message_id}`)
        return false
      }
      return true
    })
    if (messageQueue.value.length !== initialQueueLength) {
      console.log(`messageStore: 从队列中清理了 ${initialQueueLength - messageQueue.value.length} 条消息`)
    }

    // 再清空 store
    if (type) {
      const messageMap = getMessageMap(type)
      messageMap.delete(chatId)
      console.log(`messageStore: 清空 ${type} 聊天 ${chatId} 的消息`)
    } else {
      // 清空所有类型的消息
      privateMessages.value.delete(chatId)
      groupMessages.value.delete(chatId)
      console.log(`messageStore: 清空聊天 ${chatId} 的所有消息`)
    }

    // 同时清空相关的状态
    pagination.value.delete(chatId)
    loadingStates.value.delete(chatId)
    historyFullyLoaded.value.delete(chatId)
  }

  /**
   * 清空所有消息数据
   */
  const clearAllMessages = () => {
    // 先清空队列
    const queueLength = messageQueue.value.length
    if (queueLength > 0) {
      console.log(`messageStore: 清空队列中的 ${queueLength} 条消息`)
    }
    messageQueue.value = []

    // 再清空所有消息
    privateMessages.value.clear()
    groupMessages.value.clear()
    pagination.value.clear()
    loadingStates.value.clear()
    historyFullyLoaded.value.clear()
    console.log('messageStore: 清空所有消息数据')
  }

  /**
   * 重新加载指定聊天的消息
   * @param chatId 聊天ID
   * @param type 消息类型
   */
  const reloadMessages = async (chatId: string, type: MessageStoreType) => {
    // 清空现有消息
    clearMessages(chatId, type)

    // 重置分页信息
    pagination.value.delete(chatId)

    // 重置「已完整加载」标记
    historyFullyLoaded.value.delete(chatId)

    console.log(`messageStore: 重新加载 ${type} 聊天 ${chatId} 的消息`)
  }

  /**
   * 删除指定消息
   * @param messageId 消息ID
   */
  const deleteMessage = (messageId: string) => {
    // 先从队列中移除
    const queueIndex = messageQueue.value.findIndex(m => m.payload.message_id === messageId)
    if (queueIndex !== -1) {
      messageQueue.value.splice(queueIndex, 1)
      console.log(`messageStore: 从队列中删除消息 ${messageId}`)
    }

    // 再从 store 中删除
    const allMaps = [
      { map: privateMessages.value, type: 'private' as MessageStoreType },
      { map: groupMessages.value, type: 'group' as MessageStoreType },
    ]

    for (const { map, type } of allMaps) {
      for (const [chatId, messages] of map.entries()) {
        const index = messages.findIndex(m => m.payload.message_id === messageId)
        if (index !== -1) {
          messages.splice(index, 1)
          console.log(`messageStore: 从 ${type} 聊天 ${chatId} 删除消息 ${messageId}`)
          return
        }
      }
    }

    console.warn(`messageStore: 未找到要删除的消息 ${messageId}`)
  }

  // ============== Return ==============

  return {
    // State
    privateMessages,
    groupMessages,
    pagination,
    loadingStates,
    historyFullyLoaded,
    messageQueue,
    queueProcessingTimer,

    // Getters
    getMessages,
    getMessageById,
    hasMoreMessages,
    isLoading,
    getPagination,
    isHistoryFullyLoaded,
    getLastMessage,
    queueLength,
    hasMessageInQueue,

    // Actions
    addMessage,
    updateMessage,
    addHistoryMessages,
    updateMessageStatus,
    sortMessagesByTimestamp,
    markMessagesAsRead,
    updatePagination,
    setLoading,
    setHistoryFullyLoaded,
    getHistoryFullyLoaded,
    clearMessages,
    clearAllMessages,
    reloadMessages,
    deleteMessage,

    // 队列管理 Actions
    addToMessageQueue,
    removeFromMessageQueue,
    findInMessageQueue,
    clearMessageQueue,
    getQueueMessages,
    filterMessageQueue,
  }
})
