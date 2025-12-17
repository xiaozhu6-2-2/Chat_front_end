// ./service/chatService.ts

import type { Chat } from '@/types/chat'
import { useSnackbar } from '@/composables/useSnackbar'
import { transformApiChat } from '@/types/chat'
import { authApi } from './api'

const { showError } = useSnackbar()

export const ChatService = {
  async getChatList (): Promise<Chat[]> {
    try {
      const response = await authApi.get('/chat/list')

      if (response.status === 200) {
        const apiData = response.data

        // 检查响应数据格式
        if (!apiData || !Array.isArray(apiData.chats)) {
          const error = new Error('API返回数据格式错误：缺少 chats 字段或不是数组格式')
          console.error('ChatService:', error.message, apiData)
          throw error
        }

        // 转换数据格式
        const chatList = apiData.chats.map((chatItem: any) => {
          return transformApiChat(chatItem)
        })

        console.log(`ChatService: 成功获取 ${chatList.length} 个聊天会话`)
        return chatList
      } else {
        console.error(`ChatService: 获取聊天列表失败： ${response.status}`)
        throw new Error(`获取聊天列表失败：${response.status}`)
      }
    } catch {
      showError('获取聊天列表失败')
      return []
    }
  },

  async getPrivateChat (friendId: string): Promise<Chat | null> {
    try {
      const response = await authApi.post('/chat/soloprivate', {
        fid: friendId,
      })

      if (response.status === 200) {
        // 检查响应数据
        if (!response.data) {
          throw new Error('API返回数据为空')
        }

        console.log(`ChatService: 成功获取与好友 ${friendId} 的私聊会话`)
        return transformApiChat(response.data)
      }

      throw new Error(`获取私聊会话失败：${response.status}`)
    } catch (error) {
      console.error('ChatService: 获取私聊会话失败', error)
      showError('获取私聊会话失败')
      return null
    }
  },

  async getGroupChat (groupId: string): Promise<Chat | null> {
    try {
      const response = await authApi.post('/chat/sologroup', {
        gid: groupId,
      })

      if (response.status === 200) {
        // 检查响应数据
        if (!response.data) {
          throw new Error('API返回数据为空')
        }

        console.log(`ChatService: 成功获取群聊 ${groupId} 的会话信息`)
        return transformApiChat(response.data)
      }

      throw new Error(`获取群聊会话失败：${response.status}`)
    } catch (error) {
      console.error('ChatService: 获取群聊会话失败', error)
      showError('获取群聊会话失败')
      return null
    }
  },

  async updateIsPinned (chatId: string, chatType: 'private' | 'group', isPinned: boolean): Promise<boolean> {
    try {
      const response = await authApi.post('/auth/chat/updateIsPinned', {
        id: chatId,
        type: chatType,
        is_pinned: isPinned,
      })

      if (response.status === 200 && response.data?.success) {
        console.log(`ChatService: 成功更新会话 ${chatId} 置顶状态为 ${isPinned}`)
        return true
      } else {
        console.error('ChatService: 更新置顶状态失败，响应异常', response.data)
        return false
      }
    } catch (error) {
      console.error('ChatService: 更新置顶状态异常', error)
      return false
    }
  },
}
