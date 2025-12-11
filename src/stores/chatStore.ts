// stores/chatStore.ts
// 聊天UI状态管理
// 职责：
// - 管理当前选中的聊天
// - 管理聊天列表
// - 管理UI状态（加载、在线面板等）
// 注意：消息数据由 messageService 管理，不在本 store 中存储

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Chat } from '@/service/messageTypes'

export const useChatStore = defineStore('chat', () => {
  // State
  // 响应式
  const currentChat = ref<Chat | null>(null)
  const chatList = ref<Chat[]>([])//渲染chatList的数据
  const onlineBoardVisible = ref(false)
  const isLoading = ref(false)

  // Computed
  const activeChatId = computed(() => currentChat.value?.id)

  const unreadCount = computed(() =>
    chatList.value.reduce((total, chat) => total + chat.unreadCount, 0)
  )

  const chatById = computed(() => {
    const cache = new Map()
    return (id: string) => {
      if (!cache.has(id)) {
        cache.set(id, chatList.value.find(chat => chat.id === id))
      }
      return cache.get(id)
    }
  })

  // Actions
  const setCurrentChat = (chat: Chat | null) => {
    currentChat.value = chat
    if (chat) {
      // Mark chat as active
      chatList.value = chatList.value.map(c =>
        ({ ...c, isActive: c.id === chat.id })
      )
      // Clear unread count for selected chat
      updateChatUnreadCount(chat.id, 0)
    }
  }
  //更新chatlist
  const updateChatList = (chats: Chat[]) => {
    chatList.value = chats
  }
  //
  const addChat = (chat: Chat) => {
    const existingIndex = chatList.value.findIndex(c => c.id === chat.id)
    if (existingIndex >= 0) {
      chatList.value[existingIndex] = chat
    } else {
      chatList.value.unshift(chat)
    }
  }

  const updateChatLastMessage = (chatId: string, lastMessage: string) => {
    const chat = chatList.value.find(c => c.id === chatId)
    if (chat) {
      chat.lastMessage = lastMessage
      chat.updatedAt = new Date().toISOString()
      // 把当前聊天移动到顶部
      if (chatId !== currentChat.value?.id) {
        chatList.value = [chat, ...chatList.value.filter(c => c.id !== chatId)]
      }
    }
  }

  const updateChatUnreadCount = (chatId: string, count: number) => {
    const chat = chatList.value.find(c => c.id === chatId)
    if (chat) {
      chat.unreadCount = count
    }
  }

    const setOnlineBoardVisible = (visible: boolean) => {
    onlineBoardVisible.value = visible
  }

  const setLoading = (loading: boolean) => {
    isLoading.value = loading
  }

  // Reset store
  const reset = () => {
    currentChat.value = null
    chatList.value = []
    onlineBoardVisible.value = false
    isLoading.value = false
  }

  return {
    // State
    currentChat,
    chatList,
    onlineBoardVisible,
    isLoading,

    // Computed
    activeChatId,
    unreadCount,
    chatById,

    // Actions
    setCurrentChat,
    updateChatList,
    addChat,
    updateChatLastMessage,
    updateChatUnreadCount,
    setOnlineBoardVisible,
    setLoading,
    reset
  }
})