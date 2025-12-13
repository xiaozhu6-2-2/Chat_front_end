// stores/chatStore.ts
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Chat, ChatType } from '@/types/chat'
import { ChatService } from '@/service/chatService'
import { useSnackbar } from '@/composables/useSnackbar'

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

  // Actions
  //用户登录后，获取会话列表（已在useAuth调用）
  const fetchChatList = async () => {
    setLoading(true)
    console.log('chatStore: 开始获取聊天列表')

    try {
      const chats = await ChatService.getChatList()
      updateChatList(chats)
      console.log(`chatStore: 成功获取并更新 ${chats.length} 个聊天会话`)
    } catch (error) {
      console.error('chatStore: 获取聊天列表失败', error)
    } finally {
      setLoading(false)
      console.log('chatStore: 聊天列表获取流程完成')
    }
  }

  //设置活跃会话
  const setActiveChat = (chatId: string) => {
    activeChatId.value = chatId
  }

  //根据ID获取Chat
  const getChatByid = (chatId: string): Chat | undefined => {
    return chatList.value.find((chat: Chat) => chat.id === chatId)
  }

  //删除会话,只在前端删除
  const deleteChatByid = (chatId: string) => {
    console.log(`chatStore: 开始删除会话 ${chatId}`)

    // 查找会话索引
    const index = chatList.value.findIndex((chat: Chat) => chat.id === chatId)

    if (index === -1) {
      console.warn(`chatStore: 未找到会话 ${chatId}`)
      return
    }else {
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

  //更新chatlist
  const updateChatList = (chats: Chat[]) => {
    chatList.value = chats
    sortChatList()
  }

  //聊天列表排序：置顶优先，然后按更新时间
  const sortChatList = () => {
    chatList.value.sort((a: Chat, b: Chat) => {
      // 置顶的聊天优先
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1
      // 按更新时间排序（最新的在前）
      const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
      const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
      return bTime - aTime
    })
  }

  //添加会话
  const addChat = (chat: Chat) => {
    console.log(`chatStore: 添加会话 ${chat.id}`)
    const existingIndex = chatList.value.findIndex((c: Chat) => c.id === chat.id)
    if (existingIndex >= 0) {
      // 更新现有会话
      chatList.value[existingIndex] = chat
      console.log(`chatStore: 更新现有会话 ${chat.id}`)
    } else {
      // 添加新会话
      chatList.value.push(chat)
      console.log(`chatStore: 添加新会话 ${chat.id}`)
    }
    // 重新排序
    sortChatList()
  }

  //更新会话最新消息
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

  //设置未读数
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

  //会话未读数+1：接收新消息时
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

  //会话未读数归0并通知后端：会话被点击时
  const resetUnreadCount = (chatId: string) => {
    updateChatUnreadCount(chatId, 0)
  }

  //更新会话置顶状态
  const updateIsPinned = async (chatId: string, type: ChatType ,isPinned: boolean) => {
    console.log(`chatStore: 开始设置会话 ${chatId} 置顶状态为 ${isPinned}`)

    const chat = chatList.value.find((c: Chat) => c.id === chatId)
    if (!chat) {
      console.warn(`chatStore: 未找到会话 ${chatId}`)
      return
    }

    try {
      // 调用 Service 层 API
      const success = await ChatService.updateIsPinned(chatId, type, isPinned)

      if (success) {
        // 更新本地状态
        chat.isPinned = isPinned

        // 重新排序（置顶的会话会移动到相应位置）
        sortChatList()

        // 成功提示
        const { showSuccess } = useSnackbar()
        showSuccess(isPinned ? '会话已置顶' : '已取消置顶')

        console.log(`chatStore: 会话 ${chatId} 置顶状态更新成功`)
      }
    } catch (error) {
      console.error('chatStore: 设置置顶状态失败', error)
      // 错误提示
      const { showError } = useSnackbar()
      showError('设置置顶失败')
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

    // Actions
    fetchChatList,
    setActiveChat,
    getChatByid,
    deleteChatByid,
    updateChatList,
    addChat,
    updateChatLastMessage,
    updateChatUnreadCount,
    incrementUnreadCount,
    resetUnreadCount,
    updateIsPinned,
    setOnlineBoardVisible,
    setLoading,
    reset
  }
})