import type { Chat, ChatType } from '@/types/chat'
import { computed, ref } from 'vue'
import { useSnackbar } from '@/composables/useSnackbar'
import { ChatService } from '@/service/chatService'
import { messageService } from '@/service/message'
import { useChatStore } from '@/stores/chatStore'

const { showError } = useSnackbar()

export function useChat () {
  const chatStore = useChatStore()

  // Computed properties
  const chatList = computed(() => chatStore.chatList)
  const isLoading = computed(() => chatStore.isLoading)
  const activeChatId = computed(() => chatStore.activeChatId)
  // 当前选中的聊天
  const activeChat = computed(() => {
    return chatStore.chatById(chatStore.activeChatId)
  })

  // Actions
  // 用户点击某个会话；改变activeChatId；未读消息数归零；
  const selectChat = (chatId: string): Chat | null => {
    console.log(`useChat: 选择会话 ${chatId}`)

    // 1. 设置当前激活的聊天
    chatStore.setActiveChat(chatId)

    // 2. 获取聊天信息
    const chat = chatStore.chatById(chatId)
    if (!chat) {
      console.warn(`useChat: 未找到会话 ${chatId}`)
      return null
    }

    // 3. 重置未读数
    chatStore.resetUnreadCount(chatId)

    // 4.通知后端将会话的消息标记为已读
    messageService.markMessagesAsRead()

    console.log(`useChat: 会话 ${chatId} 未读数已重置`)

    console.log(`useChat: 会话 ${chatId} 选择成功`)

    return chat
  }

  // 创建新的会话：当用户从联系人card点击开始聊天时；当未在会话列表的会话收到新消息时。
  const createChat = async (fidOrGid: string, chatType: ChatType): Promise<Chat | null> => {
    console.log(`useChat: 开始创建/获取会话，${chatType === 'private' ? '好友ID' : '群组ID'}: ${fidOrGid}`)

    try {
      // 由于数据库设计，私聊的chatId跟fid不是同一个，无法在前端缓存中查找对应的chat
      // 目前统一通过API获取fid/gid对应的chat
      let chat: Chat | null = null

      if (chatType === 'private') {
        // 获取私聊会话
        chat = await ChatService.getPrivateChat(fidOrGid)
      } else if (chatType === 'group') {
        // 获取群聊会话
        chat = await ChatService.getGroupChat(fidOrGid)
      } else {
        console.error(`useChat: 未知的会话类型: ${chatType}`)
        return null
      }

      if (chat) {
        console.log(`useChat: 成功获取会话，会话ID: ${chat.id}`)
        // 将会话添加到列表（如果不存在）
        chatStore.addChat(chat)
      }

      return chat
    } catch (error) {
      console.error(`useChat: 创建/获取会话异常`, error)
      return null
    }
  }

  return {
    // State
    activeChatId,
    activeChat,
    chatList,
    isLoading,

    // Actions
    selectChat,
    createChat,
  }
}
