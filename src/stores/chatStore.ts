// stores/chatStore.ts
// 聊天UI状态管理
// 职责：
// - 管理当前选中的聊天
// - 管理聊天列表
// - 管理UI状态（加载、在线面板等）
// - 纯粹的状态管理，不调用Service，不处理UI反馈
// 注意：消息数据由 messageService 管理，不在本 store 中存储

import type { Chat, ChatType } from '@/types/chat'
import type { LocalMessage } from '@/types/message'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

/**
 * 格式化消息内容用于显示在会话列表
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
    case 'link': {
      return '[链接]'
    }
    case 'emoji': {
      return '[表情]'
    }
    case 'annoucement': {
      return '[公告]'
    }
    default: {
      return '[消息]'
    }
  }
}

export const useChatStore = defineStore('chat', () => {
  // State
  // 响应式
  const activeChatId = ref<string>('')
  const chatList = ref<Chat[]>([])
  const onlineBoardVisible = ref(false)
  const isLoading = ref(false)

  // Computed

  // 根据 ID 获取聊天
  const chatById = computed(() => {
    return (chatId: string) => chatList.value.find((chat: Chat) => chat.id === chatId)
  })

  // 计算所有聊天的未读消息总数
  const totalUnreadCount = computed(() => {
    return chatList.value.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0)
  })

  // Actions
  /**
   * 设置聊天列表
   *
   * 执行流程：
   * 1. 更新聊天列表
   * 2. 执行排序
   *
   * @param chats 聊天列表数据
   */
  const setChatList = (chats: Chat[]) => {
    updateChatList(chats)
    console.log(`chatStore: 成功设置 ${chats.length} 个聊天会话`)
  }

  // 设置活跃会话
  const setActiveChat = (chatId: string) => {
    activeChatId.value = chatId
    // 打开聊天时清零@未读数
    resetMentionedCount(chatId)
  }

  // 根据ID获取Chat
  const getChatByid = (chatId: string): Chat | undefined => {
    return chatList.value.find((chat: Chat) => chat.id === chatId)
  }

  // 删除会话,只在前端删除
  const deleteChatByid = (chatId: string) => {
    console.log(`chatStore: 开始删除会话 ${chatId}`)

    // 查找会话索引
    const index = chatList.value.findIndex((chat: Chat) => chat.id === chatId)

    if (index === -1) {
      console.warn(`chatStore: 未找到会话 ${chatId}`)
      return
    } else {
      // 获取被删除的会话信息
      const deletedChat = chatList.value[index]

      // 从列表中移除
      chatList.value.splice(index, 1)

      // 如果删除的是当前活跃的会话，清空活跃状态
      if (activeChatId.value === chatId) {
        activeChatId.value = ''
        console.log(`chatStore: 已清空当前活跃会话，因为删除了会话 ${chatId}`)
      }

      console.log(`chatStore: 成功删除会话 ${chatId} (${deletedChat!.name})`)
    }
  }

  // 更新chatlist
  const updateChatList = (chats: Chat[]) => {
    chatList.value = chats
    sortChatList()
  }

  // 聊天列表排序：置顶优先，然后按更新时间
  const sortChatList = () => {
    chatList.value.sort((a: Chat, b: Chat) => {
      // 置顶的聊天优先
      if (a.isPinned && !b.isPinned) {
        return -1
      }
      if (!a.isPinned && b.isPinned) {
        return 1
      }
      // 按更新时间排序（最新的在前）
      const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
      const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
      return bTime - aTime
    })
  }

  // 添加会话
  const addChat = (chat: Chat) => {
    console.log(`chatStore: 添加会话 ${chat.id}`)
    const existingIndex = chatList.value.findIndex((c: Chat) => c.id === chat.id)
    if (existingIndex === -1) {
      // 添加新会话
      chatList.value.push(chat)
      console.log(`chatStore: 添加新会话 ${chat.id}`)
    } else {
      // 更新现有会话
      chatList.value[existingIndex] = chat
      console.log(`chatStore: 更新现有会话 ${chat.id}`)
    }
    // 重新排序
    sortChatList()
  }

  // 更新会话最新消息
  const updateChatLastMessage = (chatId: string, lastMessage: string) => {
    console.log(`chatStore: 更新会话 ${chatId} 的最新消息`)
    const chat = chatList.value.find((c: Chat) => c.id === chatId)
    if (chat) {
      chat.lastMessage = lastMessage
      chat.updatedAt = new Date().toISOString()
      // 重新排序（将此会话移到顶部，除非是置顶的）
      sortChatList()
      console.log(`chatStore: 会话 ${chatId} 最新消息更新成功`)
    } else {
      console.warn(`chatStore: 未找到会话 ${chatId}`)
    }
  }

  /**
   * 根据消息对象更新会话最新消息
   * @param chatId 会话ID
   * @param message 消息对象
   */
  const updateChatLastMessageFromMessage = (chatId: string, message: LocalMessage) => {
    const messageContent = formatMessageContent(message)
    updateChatLastMessage(chatId, messageContent)
  }

  // 设置未读数
  const updateChatUnreadCount = (chatId: string, count: number) => {
    console.log(`chatStore: 设置会话 ${chatId} 未读数为 ${count}`)
    const chat = chatList.value.find((c: Chat) => c.id === chatId)
    if (chat) {
      chat.unreadCount = Math.max(0, count)
      console.log(`chatStore: 会话 ${chatId} 未读数更新成功`)
    } else {
      console.warn(`chatStore: 未找到会话 ${chatId}`)
    }
  }

  // 会话未读数+1：接收新消息时
  const incrementUnreadCount = (chatId: string) => {
    console.log(`chatStore: 会话 ${chatId} 未读数+1`)
    const chat = chatList.value.find((c: Chat) => c.id === chatId)
    if (chat) {
      chat.unreadCount = (chat.unreadCount || 0) + 1
      console.log(`chatStore: 会话 ${chatId} 未读数现在是 ${chat.unreadCount}`)
    } else {
      console.warn(`chatStore: 未找到会话 ${chatId}`)
    }
  }

  // 会话未读数归0并通知后端：会话被点击时
  const resetUnreadCount = (chatId: string) => {
    updateChatUnreadCount(chatId, 0)
  }

  // 会话@未读数+1：接收@消息时
  const incrementMentionedCount = (chatId: string) => {
    console.log(`chatStore: 会话 ${chatId} @未读数+1`)
    const chat = chatList.value.find((c: Chat) => c.id === chatId)
    if (chat) {
      chat.mentionedCount = (chat.mentionedCount || 0) + 1
      console.log(`chatStore: 会话 ${chatId} @未读数现在是 ${chat.mentionedCount}`)
    } else {
      console.warn(`chatStore: 未找到会话 ${chatId}`)
    }
  }

  // 会话@未读数归0：打开聊天时
  const resetMentionedCount = (chatId: string) => {
    console.log(`chatStore: 会话 ${chatId} @未读数归0`)
    const chat = chatList.value.find((c: Chat) => c.id === chatId)
    if (chat) {
      chat.mentionedCount = 0
      console.log(`chatStore: 会话 ${chatId} @未读数已清零`)
    } else {
      console.warn(`chatStore: 未找到会话 ${chatId}`)
    }
  }

  /**
   * 更新会话置顶状态
   *
   * 执行流程：
   * 1. 查找会话
   * 2. 更新本地状态
   * 3. 重新排序
   *
   * @param chatId 会话ID
   * @param isPinned 是否置顶
   */
  const updateIsPinned = (chatId: string, isPinned: boolean) => {
    console.log(`chatStore: 开始设置会话 ${chatId} 置顶状态为 ${isPinned}`)

    const chat = chatList.value.find((c: Chat) => c.id === chatId)
    if (!chat) {
      console.warn(`chatStore: 未找到会话 ${chatId}`)
      return
    }

    // 更新本地状态
    chat.isPinned = isPinned

    // 重新排序（置顶的会话会移动到相应位置）
    sortChatList()

    console.log(`chatStore: 会话 ${chatId} 置顶状态更新成功`)
  }

  const setOnlineBoardVisible = (visible: boolean) => {
    onlineBoardVisible.value = visible
  }

  const setLoading = (loading: boolean) => {
    isLoading.value = loading
  }

  // Reset store
  const reset = () => {
    activeChatId.value = ''
    chatList.value = []
    onlineBoardVisible.value = false
    isLoading.value = false
  }

  return {
    // State
    activeChatId,
    chatList,
    onlineBoardVisible,
    isLoading,

    // Computed
    chatById,
    totalUnreadCount,

    // Actions
    setChatList,
    setActiveChat,
    getChatByid,
    deleteChatByid,
    updateChatList,
    addChat,
    updateChatLastMessage,
    updateChatLastMessageFromMessage,
    updateChatUnreadCount,
    incrementUnreadCount,
    resetUnreadCount,
    incrementMentionedCount,
    resetMentionedCount,
    updateIsPinned,
    setOnlineBoardVisible,
    setLoading,
    reset,
  }
})
