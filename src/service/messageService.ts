/**
 * Message Service - 四层架构中的 Service 层
 * 负责业务逻辑处理，协调 API 和 WebSocket 通信
 */

import { authApi } from './api'

// API 响应类型定义
interface HistoryMessageResponse {
  total_pages: number
  current_page: number
  total_items: number
  messages: any[]
}

interface ReadStatusResponse {
  read_counts: Array<{
    message_id: string
    read_count: number
  }>
}

interface ShowReadersResponse {
  readers: Array<{
    uid: string
    username: string
    avatar: string
  }>
  total: number
}

export interface ReadStatus {
  messageId: string
  readCount: number
}

class MessageService {
  // ========== API 方法 ==========

  /**
   * 获取私聊历史消息
   * @returns 包含消息列表和分页信息
   */
  async fetchHistoryPrivateMessages (
    pid: string,
    limit = 50,
    offset = 0,
  ): Promise<{ messages: any[]; totalPages: number; currentPage: number; totalItems: number }> {
    try {
      const response = await authApi.post<HistoryMessageResponse>('/message/private_history', {
        pid,
        limit,
        offset,
      })

      if (response.status === 200 && response.data.messages) {
        return {
          messages: response.data.messages,
          totalPages: response.data.total_pages,
          currentPage: response.data.current_page,
          totalItems: response.data.total_items,
        }
      }
      return { messages: [], totalPages: 0, currentPage: 0, totalItems: 0 }
    } catch (error) {
      console.error('Failed to fetch private history messages:', error)
      throw error
    }
  }

  /**
   * 获取群聊历史消息
   * @returns 包含消息列表和分页信息
   */
  async fetchHistoryGroupMessages (
    gid: string,
    limit = 50,
    offset = 0,
  ): Promise<{ messages: any[]; totalPages: number; currentPage: number; totalItems: number }> {
    try {
      const response = await authApi.post<HistoryMessageResponse>('/message/group_history', {
        gid,
        limit,
        offset,
      })

      if (response.status === 200 && response.data.messages) {
        return {
          messages: response.data.messages,
          totalPages: response.data.total_pages,
          currentPage: response.data.current_page,
          totalItems: response.data.total_items,
        }
      }
      return { messages: [], totalPages: 0, currentPage: 0, totalItems: 0 }
    } catch (error) {
      console.error('Failed to fetch group history messages:', error)
      throw error
    }
  }

  /**
   * 标记消息为已读
   */
  async markMessagesAsRead (
    chatId: string,
    type: 'private' | 'group',
    timestamp: number,
  ): Promise<void> {
    try {
      await authApi.post('/message/read', {
        chat_id: chatId,
        type,
        timestamp,
      })
    } catch (error) {
      console.error('Failed to mark messages as read:', error)
      throw error
    }
  }

  /**
   * 获取群聊消息已读状态
   */
  async getGroupReadStatus (
    gid: string,
    messageIds: string[],
  ): Promise<ReadStatus[]> {
    try {
      const response = await authApi.post<ReadStatusResponse>('/message/read_count', {
        gid,
        message_ids: messageIds,
      })

      if (response.status === 200 && response.data.read_counts) {
        return response.data.read_counts.map(item => ({
          messageId: item.message_id,
          readCount: item.read_count,
        }))
      }
      return []
    } catch (error) {
      console.error('Failed to get group read status:', error)
      throw error
    }
  }

  /**
   * 获取消息已读人员列表
   */
  async getShowReaders (
    messageId: string,
    chatId: string,
    chatType: 'private' | 'group',
  ): Promise<Array<{ uid: string; username: string; avatar: string }>> {
    try {
      const response = await authApi.post<ShowReadersResponse>('/message/show_readers', {
        message_id: messageId,
        chat_id: chatId,
        chat_type: chatType,
      })

      if (response.status === 200 && response.data.readers) {
        return response.data.readers
      }
      return []
    } catch (error) {
      console.error('Failed to get readers:', error)
      throw error
    }
  }

  /**
   * 撤回消息
   */
  async revokeMessage (
    messageId: string,
    chatId: string,
    chatType: 'private' | 'group',
  ): Promise<boolean> {
    try {
      const response = await authApi.post<{ success: boolean }>('/message/revoke', {
        message_id: messageId,
        chat_id: chatId,
        chat_type: chatType,
      })

      if (response.status === 200 && response.data.success) {
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to revoke message:', error)
      throw error
    }
  }
}

// 创建单例实例
export const messageService = new MessageService()

// 导出类型
export type { HistoryMessageResponse, ReadStatusResponse }
