/**
 * useDirectMessage.ts
 *
 * 用于在不打开聊天窗口的情况下发送私聊消息
 * 适用于群邀请、系统通知等场景
 */

import type { FriendWithUserInfo } from '@/types/friend'

import { MessageType } from '@/types/websocket'
import { createTextMessage } from '@/types/message'
import { websocketService } from '@/service/websocket'
import { useUser } from './useUser'

export function useDirectMessage() {
  const { getCurrentUserId, getCurrentUsername, getCurrentUserAvatar } = useUser()

  /**
   * 直接向好友发送私聊消息，无需打开聊天窗口
   * @param friendUid 好友的用户ID (uid)
   * @param friendFid 好友关系ID (fid) - 用作 chat_id
   * @param content 消息内容
   * @returns Promise<string> - 消息ID
   */
  async function sendDirectPrivateMessage(
    friendUid: string,
    friendFid: string,
    content: string
  ): Promise<string> {
    const senderId = getCurrentUserId()
    const senderName = getCurrentUsername()
    const senderAvatar = getCurrentUserAvatar()

    // 创建消息对象
    // 对于私聊：chat_id 是 fid，receiver_id 是 uid
    const message = createTextMessage(
      MessageType.PRIVATE,
      senderId,
      senderName,
      senderAvatar,
      friendUid, // receiver_id 是好友的 uid
      content,
      friendFid, // chat_id 是好友的 fid
      true,
      false,
      null,
      null
    )

    // 通过 WebSocket 发送
    websocketService.send(message)

    return message.payload.message_id || ''
  }

  /**
   * 向多个好友发送群邀请消息
   * @param friends 好友数组
   * @param groupId 群聊ID
   */
  async function sendGroupInvitations(
    friends: FriendWithUserInfo[],
    groupId: string
  ): Promise<{successCount: number, failedCount: number}> {
    let successCount = 0
    let failedCount = 0

    const promises = friends.map(async (friend) => {
      try {
        const messageContent = `邀请你进入群聊${groupId}`
        await sendDirectPrivateMessage(friend.id, friend.fid, messageContent)
        successCount++
      } catch (error) {
        console.error(`邀请 ${friend.name} 失败:`, error)
        failedCount++
      }
    })

    await Promise.all(promises)
    return { successCount, failedCount }
  }

  return {
    sendDirectPrivateMessage,
    sendGroupInvitations,
  }
}
