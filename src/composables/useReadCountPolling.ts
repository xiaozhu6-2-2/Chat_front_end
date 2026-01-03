/**
 * useReadCountPolling
 * 群聊已读人数轮询 Composable
 *
 * 功能：
 * - 监听会话变化，自动启动/停止群聊已读人数轮询
 * - 定时获取当前用户在群聊中发送消息的已读人数
 * - 切换会话时自动清理旧定时器
 */

import { messageService } from '@/service/messageService'
import { useMessageStore } from '@/stores/messageStore'

const POLLING_INTERVAL = 5000 // 5s轮询间隔

export function useReadCountPolling() {
  const messageStore = useMessageStore()

  /**
   * 监听会话变化，自动启动/停止轮询
   * @param chatId 当前会话ID
   * @param chatType 会话类型 ('private' | 'group')
   */
  const watchChatChange = (chatId: string, chatType: string) => {
    // 1. 停止现有轮询
    stopPolling()

    // 2. 仅对群聊启动轮询
    if (!chatId || chatType !== 'group') {
      return
    }

    // 3. 存储当前轮询的会话ID
    messageStore.currentPollingChatId = chatId

    // 4. 启动定时器
    messageStore.readCountPollingTimer = setInterval(() => {
      pollReadCounts()
    }, POLLING_INTERVAL) as unknown as number

    // 5. 立即执行一次轮询
    pollReadCounts()

    console.log(`[ReadCountPolling] Started for chat: ${chatId}`)
  }

  /**
   * 执行已读人数轮询
   */
  const pollReadCounts = async () => {
    const chatId = messageStore.currentPollingChatId
    if (!chatId) return

    // 获取当前用户在该群聊发送的未撤回消息
    const messages = messageStore.getMessages(chatId, 'group')
    const myMessages = messages.filter(
      msg => msg.userIsSender && !msg.is_revoked && msg.payload.message_id,
    )

    if (myMessages.length === 0) return

    const messageIds = myMessages.map(msg => msg.payload.message_id!)

    try {
      const results = await messageService.getGroupReadStatus(chatId, messageIds)

      for (const { messageId, readCount } of results) {
        messageStore.updateMessageReadCount(messageId, readCount, chatId)
      }

      console.log(`[ReadCountPolling] Updated ${results.length} read counts`)
    } catch (error) {
      console.error('[ReadCountPolling] Failed to fetch read counts:', error)
      // 静默失败，不显示用户通知
    }
  }

  /**
   * 停止轮询
   */
  const stopPolling = () => {
    if (messageStore.readCountPollingTimer) {
      clearInterval(messageStore.readCountPollingTimer)
      messageStore.readCountPollingTimer = undefined
      messageStore.currentPollingChatId = ''
      console.log('[ReadCountPolling] Stopped')
    }
  }

  /**
   * 重置轮询状态
   */
  const reset = () => {
    stopPolling()
  }

  return {
    watchChatChange,
    reset,
  }
}
