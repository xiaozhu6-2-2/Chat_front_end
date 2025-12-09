import { computed, ref } from 'vue'
import { useChatStore } from '@/stores/chatStore'
import { messageService } from '@/service/message'
import { MessageText, type LocalMessage, ContentType, MessageStatus } from '@/service/messageTypes'
import {  type Chat,ChatType, MessageType } from '@/service/messageTypes'
import { envConfig, devLog, isDevelopment } from '@/utils/env'

export function useChat() {
  const chatStore = useChatStore()
  const currentChatId = ref<string>('')

  // Computed properties
  const currentChat = computed(() => chatStore.currentChat)
  const chatList = computed(() => chatStore.chatList)
  const messages = computed(() => {
    if (!currentChatId.value || !currentChat.value) return []
    // 根据聊天类型获取消息
    const mapType = currentChat.value.type === ChatType.GROUP ? 'Group' : 'Private'
    return messageService.getMessages(mapType, ref(currentChatId.value)).value
  })
  const unreadCount = computed(() => chatStore.unreadCount)
  const isLoading = computed(() => chatStore.isLoading)

  // Actions
  const selectChat = (chat: Chat) => {
    chatStore.setCurrentChat(chat)
    currentChatId.value = chat.id

    // 拉取历史消息
    if (chat.type === ChatType.GROUP) {
      messageService.fetchHistoryGroupMessages(chat.id)
    } else {
      messageService.fetchHistoryPrivateMessages(chat.id)
    }
  }

  const sendMessage = async (content: string) => {
    if (!currentChat.value || !content.trim()) return

    const messageType = currentChat.value.type === ChatType.GROUP ? MessageType.GROUP : MessageType.PRIVATE

    // 获取当前用户ID（优先使用环境配置，其次使用默认值）
    const currentUserId = isDevelopment() ? envConfig.mockUserId : 'current-user'

    // 创建消息
    const newMessage = new MessageText(messageType, {
      senderId: currentUserId,
      receiverId: currentChat.value.id,
      contentType: ContentType.TEXT,
      detail: content.trim()
    })

    devLog('Creating new message', {
      type: messageType,
      senderId: currentUserId,
      receiverId: currentChat.value.id
    })

    // 设置发送状态
    newMessage.sendStatus = MessageStatus.PENDING
    newMessage.userIsSender = true

    try {
      // 发送消息
      messageService.sendWithUpdate(newMessage)

      // 更新状态为发送中
      newMessage.sendStatus = MessageStatus.SENDING

    } catch (error) {
      console.error('Failed to send message:', error)
      newMessage.sendStatus = MessageStatus.FAILED
    }
  }

  // const markAsRead = (chatId?: string) => {
  //   const targetChatId = chatId || currentChatId.value
  //   // 消息已读标记可以在 messageService 中实现
  //   console.log('Mark messages as read for chat:', targetChatId)
  // }

  const refreshChatList = () => {
    // 聊天列表刷新逻辑根据环境选择数据源：
    // - 开发环境：使用模拟数据
    // - 生产环境：从API拉取

    devLog('Refreshing chat list')

    if (isDevelopment()) {
      // 开发环境使用模拟数据
      const mockChats: Chat[] = [
        {
          id: 'group-001',
          name: '309宿舍群',
          type: ChatType.GROUP,
          avatar: '/src/assets/yxd.jpg',
          lastMessage: '大家好！',
          unreadCount: 3,
          isActive: false,
          updatedAt: new Date().toISOString()
        },
        {
          id: 'private-001',
          name: '张三',
          type: ChatType.PRIVATE,
          avatar: '/src/assets/user1.jpg',
          lastMessage: '明天见！',
          unreadCount: 0,
          isActive: false,
          updatedAt: new Date().toISOString()
        },
        {
          id: 'group-002',
          name: '前端开发交流群',
          type: ChatType.GROUP,
          avatar: '/src/assets/group2.jpg',
          lastMessage: '这个功能不错',
          unreadCount: 5,
          isActive: false,
          updatedAt: new Date().toISOString()
        }
      ]
      chatStore.updateChatList(mockChats)
      devLog('Mock chat list loaded', { count: mockChats.length })
    } else {
      // 生产环境：todo: 接入拉取聊天表的API
      console.log('TODO: Implement chat list API call for production')
    }
  }

  return {
    // State
    currentChat,
    chatList,
    messages,
    unreadCount,
    isLoading,

    // Actions
    selectChat,
    sendMessage,
    // markAsRead,
    refreshChatList
  }
}