import type { Chat, ChatType } from '@/types/chat'
import { computed, ref } from 'vue'
import { useSnackbar } from '@/composables/useSnackbar'
import { ChatService } from '@/service/chatService'
import { useChatStore } from '@/stores/chatStore'
import { useMessage } from './useMessage'

export function useChat () {
  const chatStore = useChatStore()
  const { showError, showSuccess } = useSnackbar()

  // Computed properties
  const chatList = computed(() => chatStore.chatList)
  const isLoading = computed(() => chatStore.isLoading)
  const activeChatId = computed(() => chatStore.activeChatId)
  // 当前选中的聊天
  const activeChat = computed(() => {
    return chatStore.chatById(chatStore.activeChatId)
  })

  // 当前聊天类型
  const activeChatType = computed(() => {
    if (!activeChat.value) return 'private' as ChatType
    return activeChat.value.type
  })

  // Actions

  /**
   * 初始化聊天列表
   *
   * 执行流程：
   * 1. 检查是否强制初始化
   * 2. 非强制时检查缓存
   * 3. 调用Service获取数据
   * 4. 更新Store
   * 5. 处理错误和用户反馈
   *
   * @param force 是否强制初始化（默认true）
   */
  const initializeChats = async (force = true): Promise<void> => {
    try {
      // 非强制初始化时，检查缓存中是否已有会话
      if (!force && chatList.value.length > 0) {
        console.log('聊天列表已缓存，跳过初始化')
        return
      }

      // 1. 调用Service获取数据
      const chats = await ChatService.getChatList()

      // 2. 更新Store
      chatStore.setChatList(chats)

      console.log('聊天列表初始化成功')
    } catch (error) {
      console.error('聊天列表初始化失败:', error)
      showError('获取聊天列表失败，请刷新重试')
    }
  }

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

    // 4. 加载历史消息
    const { loadHistoryMessages } = useMessage()
    loadHistoryMessages(chatId, chat.type)

    // 5. 标记消息为已读
    const { markCurrentChatAsRead } = useMessage()
    markCurrentChatAsRead()

    console.log(`useChat: 会话 ${chatId} 未读数已重置`)

    console.log(`useChat: 会话 ${chatId} 选择成功`)

    return chat
  }

  /**
   * 创建或获取聊天会话
   *
   * 执行流程：
   * 1. 先从缓存查找
   * 2. 缓存没有则调用API
   * 3. 处理成功/失败
   * 4. 添加到Store
   * 5. 显示用户反馈
   *
   * @param fidOrGid 好友ID或群组ID
   * @param chatType 会话类型
   * @returns Promise<Chat | null> 会话信息或null
   */
  const createChat = async (fidOrGid: string, chatType: ChatType): Promise<Chat | null> => {
    console.log(`useChat: 开始创建/获取会话，${chatType === 'private' ? '好友ID' : '群组ID'}: ${fidOrGid}`)

    try {
      // 1. 先从缓存查找（现在后端已更新，fid和私聊pid是同一个id）
      let chat = chatStore.getChatByid(fidOrGid)

      if (chat) {
        console.log(`useChat: 从缓存找到会话 ${fidOrGid}`)
        return chat
      }

      // 2. 缓存没有则调用API
      if (chatType === 'private') {
        // 获取私聊会话
        chat = await ChatService.getPrivateChat(fidOrGid)
      } else if (chatType === 'group') {
        // 获取群聊会话
        chat = await ChatService.getGroupChat(fidOrGid)
      } else {
        console.error(`useChat: 未知的会话类型: ${chatType}`)
        showError('未知的会话类型')
        return null
      }

      if (chat) {
        console.log(`useChat: 成功获取会话，会话ID: ${chat.id}`)
        // 将会话添加到列表（如果不存在）
        chatStore.addChat(chat)
      }

      return chat
    } catch (error) {
      console.error(`useChat: 创建/获取会话失败:`, error)
      showError('创建会话失败，请重试')
      return null
    }
  }

  /**
   * 切换会话置顶状态
   *
   * @param chatId 会话ID
   * @param type 会话类型
   * @param isPinned 是否置顶
   */
  const togglePinChat = async (
    chatId: string,
    type: ChatType,
    isPinned: boolean,
  ): Promise<void> => {
    try {
      // 调用Service更新置顶状态
      await ChatService.updateIsPinned(chatId, type, isPinned)

      // 更新本地状态
      chatStore.updateIsPinned(chatId, isPinned)

      showSuccess(isPinned ? '会话已置顶' : '已取消置顶')
    } catch (error) {
      console.error('更新置顶状态失败:', error)
      showError('设置置顶失败，请重试')
    }
  }

  /**
   * 重置聊天状态（用于登出时）
   */
  const reset = (): void => {
    chatStore.reset()
  }

  return {
    // State
    activeChatId,
    activeChat,
    activeChatType,
    chatList,
    isLoading,

    // Actions
    initializeChats, // 新增：初始化聊天列表
    selectChat,
    createChat,
    togglePinChat, // 新增：切换置顶状态
    reset, // 新增：重置状态
  }
}
