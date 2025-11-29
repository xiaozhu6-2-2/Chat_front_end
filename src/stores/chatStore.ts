// stores/chatStore.ts
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Chat, LocalMessage } from '@/service/messageTypes'
import { MessageStatus } from '@/service/messageTypes'

export const useChatStore = defineStore('chat', () => {
  // State
  const currentChat = ref<Chat | null>(null)
  const chatList = ref<Chat[]>([])
  const messages = ref<LocalMessage[]>([])
  const onlineBoardVisible = ref(false)
  const isLoading = ref(false)

  // Computed
  const activeChatId = computed(() => currentChat.value?.id)

  const currentChatMessages = computed(() =>
    messages.value.filter(msg => msg.payload.chatId === currentChat.value?.id)
  )

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

  const updateChatList = (chats: Chat[]) => {
    chatList.value = chats
  }

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
      // Move to top if not current chat
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

  const incrementUnreadCount = (chatId: string) => {
    const chat = chatList.value.find(c => c.id === chatId)
    if (chat && chatId !== currentChat.value?.id) {
      chat.unreadCount++
    }
  }

  const addMessage = (message: LocalMessage) => {
    messages.value.push(message)
    updateChatLastMessage(message.payload.chatId!, message.payload.detail || '')

    // Increment unread count if not current chat
    if (message.payload.chatId !== currentChat.value?.id) {
      incrementUnreadCount(message.payload.chatId!)
    }
  }

  const updateMessageStatus = (messageId: string, sendStatus: LocalMessage['sendStatus']) => {
    const message = messages.value.find(msg => msg.payload.messageId === messageId)
    if (message) {
      message.sendStatus = sendStatus
    }
  }

  const markMessagesAsRead = (chatId: string) => {
    messages.value
      .filter(msg => msg.payload.chatId === chatId)
      .forEach(msg => {
        // LocalMessage doesn't have isRead property, could be added if needed
        msg.sendStatus = MessageStatus.SENT // Mark as sent/read equivalent
      })
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
    messages.value = []
    onlineBoardVisible.value = false
    isLoading.value = false
  }

  return {
    // State
    currentChat,
    chatList,
    messages,
    onlineBoardVisible,
    isLoading,

    // Computed
    activeChatId,
    currentChatMessages,
    unreadCount,
    chatById,

    // Actions
    setCurrentChat,
    updateChatList,
    addChat,
    updateChatLastMessage,
    updateChatUnreadCount,
    addMessage,
    updateMessageStatus,
    markMessagesAsRead,
    setOnlineBoardVisible,
    setLoading,
    reset
  }
})