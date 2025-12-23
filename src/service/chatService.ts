// ./service/chatService.ts
/**
 * 聊天服务层 - 纯数据访问层
 *
 * 职责：
 * - 负责API调用
 * - 数据转换
 * - 错误抛出（不处理UI）
 *
 * 数据流：
 * - 输入：请求参数
 * - 输出：转换后的数据或错误
 * - 副作用：发送HTTP请求
 */

import type { ApiChat, Chat } from '@/types/chat'
import { transformApiChat } from '@/types/chat'
import { authApi } from './api'

export const ChatService = {
  /**
   * 获取聊天列表
   *
   * 执行流程：
   * 1. 调用 /chat/list API
   * 2. 验证响应格式
   * 3. 转换数据格式
   * 4. 返回转换后的数据
   *
   * @returns Promise<Chat[]> 聊天列表
   * @throws Error API错误或数据格式错误
   */
  async getChatList (): Promise<Chat[]> {
    try {
      const response = await authApi.get('/chat/list')

      if (response.status !== 200) {
        throw new Error(`获取聊天列表失败：HTTP ${response.status}`)
      }

      const apiData = response.data

      // 验证响应数据格式
      if (!apiData || !Array.isArray(apiData.chats)) {
        throw new Error('API返回数据格式错误：缺少 chats 字段或不是数组格式')
      }

      // 转换数据格式
      const chatList = apiData.chats.map((chatItem: ApiChat) => {
        return transformApiChat(chatItem)
      })

      console.log(`ChatService: 成功获取 ${chatList.length} 个聊天会话`)
      return chatList
    } catch (error) {
      console.error('ChatService.getChatList:', error)
      throw error // 重新抛出，让上层处理
    }
  },

  /**
   * 获取私聊会话
   *
   * @param friendId 好友ID
   * @returns Promise<Chat> 私聊会话信息
   * @throws Error API错误或数据错误
   */
  async getPrivateChat (friendId: string): Promise<Chat> {
    console.log(`ChatService.getPrivateChat: 开始请求，friendId=${friendId}`)
    try {
      console.log(`ChatService.getPrivateChat: 发送 POST 请求到 /chat/soloprivate，body: { fid: ${friendId} }`)
      const response = await authApi.post('/chat/soloprivate', {
        fid: friendId,
      })
      console.log(`ChatService.getPrivateChat: 收到响应，status=${response.status}, data=`, response.data)

      if (response.status !== 200) {
        throw new Error(`获取私聊会话失败：HTTP ${response.status}`)
      }

      if (!response.data) {
        throw new Error('API返回数据为空')
      }

      console.log(`ChatService: 成功获取与好友 ${friendId} 的私聊会话`)
      return transformApiChat(response.data)
    } catch (error) {
      console.error('ChatService.getPrivateChat: 请求失败:', error)
      throw error
    }
  },

  /**
   * 获取群聊会话
   *
   * @param groupId 群组ID
   * @returns Promise<Chat> 群聊会话信息
   * @throws Error API错误或数据错误
   */
  async getGroupChat (groupId: string): Promise<Chat> {
    try {
      const response = await authApi.post('/chat/sologroup', {
        gid: groupId,
      })

      if (response.status !== 200) {
        throw new Error(`获取群聊会话失败：HTTP ${response.status}`)
      }

      if (!response.data) {
        throw new Error('API返回数据为空')
      }

      console.log(`ChatService: 成功获取群聊 ${groupId} 的会话信息`)
      return transformApiChat(response.data)
    } catch (error) {
      console.error('ChatService.getGroupChat:', error)
      throw error
    }
  },

  /**
   * 更新会话置顶状态
   *
   * @param chatId 会话ID
   * @param chatType 会话类型
   * @param isPinned 是否置顶
   * @returns Promise<boolean> 是否成功
   * @throws Error API错误
   */
  async updateIsPinned (chatId: string, chatType: 'private' | 'group', isPinned: boolean): Promise<boolean> {
    try {
      const response = await authApi.post('/chat/updateIsPinned', {
        id: chatId,
        type: chatType,
        is_pinned: isPinned,
      })

      if (response.status === 200 && response.data?.success) {
        console.log(`ChatService: 成功更新会话 ${chatId} 置顶状态为 ${isPinned}`)
        return true
      }

      throw new Error(response.data?.message || '更新置顶状态失败')
    } catch (error) {
      console.error('ChatService.updateIsPinned:', error)
      throw error
    }
  },
}
