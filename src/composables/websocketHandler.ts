/**
 * WebSocket 通知处理器
 * 用于监听、分发和处理 WebSocket 推送的各种通知消息
 */

import { websocketService } from '@/service/websocket'
import { messageService } from '@/service/messageService'
import { useFriendRequestStore } from '@/stores/friendRequestStore'
import { useGroupRequestStore } from '@/stores/groupRequestStore'
import { useFriendStore } from '@/stores/friendStore'
import { useGroupStore } from '@/stores/groupStore'
import { useMessageStore, type MessageStoreType } from '@/stores/messageStore'
import { useChatStore } from '@/stores/chatStore'
import { useAuthStore } from '@/stores/authStore'
import { useSnackbar } from '@/composables/useSnackbar'
import type { FriendRequest } from '@/types/friendRequest'
import type { GroupRequest } from '@/types/groupRequest'
import type { FriendWithUserInfo } from '@/types/friend'
import { ChatType, type Chat } from '@/types/chat'
import { LocalMessage, MessageStatus, WSMessage } from '@/types/message'
import { GroupRequestStatus, transformGroupApprovalFromApi } from '@/types/groupRequest'
import {
  MessageType,
  type MessageAckData,
  type MessageError,
  type FriendRequestNotification,
  type FriendRequestResultNotification,
  type FriendDeletedNotification,
  type UpdateOnlineStateData,
  type GroupRequestNotification,
  type GroupRequestResultNotification,
  type MemberKickedNotification,
  type GroupDisbandedNotification,
  type ExitGroupNotification,
  type RoleChangedNotification,
  type GroupOwnerTransferNotification,
  type MemberMuteChangedNotification,
  type MessageReadNotification,
  type MessageRevokedNotification,
} from '@/types/websocket'

// ==================== 监听器注册 ====================

export function useWebSocketHandler() {
  /**
   * 设置所有通知处理器
   * 在 WebSocket 连接建立后调用
   */
  const setupNotificationHandlers = (): void => {
    // ==================== 连接状态相关 ====================
    websocketService.on('message', handleMessage)
    websocketService.on('messageAck', handleMessageAck)
    websocketService.on('messageError', handleMessageError)
    websocketService.on('connected', handleConnected)
    websocketService.on('error', handleError)

    // ==================== 好友系统通知 ====================
    websocketService.on('friendRequestNotification', handleFriendRequestNotification)
    websocketService.on('friendRequestResultNotification', handleFriendRequestResultNotification)
    websocketService.on('friendDeletedNotification', handleFriendDeletedNotification)
    websocketService.on('updateOnlineState', handleUpdateOnlineState)

    // ==================== 群组系统通知 ====================
    websocketService.on('groupRequestNotification', handleGroupRequestNotification)
    websocketService.on('groupRequestResultNotification', handleGroupRequestResultNotification)
    websocketService.on('memberKickedNotification', handleMemberKickedNotification)
    websocketService.on('groupDisbandedNotification', handleGroupDisbandedNotification)
    websocketService.on('exitGroupNotification', handleExitGroupNotification)
    websocketService.on('roleChangedNotification', handleRoleChangedNotification)
    websocketService.on('groupOwnerTransferNotification', handleGroupOwnerTransferNotification)
    websocketService.on('memberMuteChangedNotification', handleMemberMuteChangedNotification)

    // ==================== 消息系统通知 ====================
    websocketService.on('messageReadNotification', handleMessageReadNotification)
    websocketService.on('messageRevokedNotification', handleMessageRevokedNotification)

    console.log('[WebSocketHandler] 所有通知处理器已注册')
  }

  /**
   * 清理所有通知处理器
   * 在组件卸载或需要断开连接时调用
   */
  const cleanupNotificationHandlers = (): void => {
    // ==================== 连接状态相关 ====================
    websocketService.off('connected', handleConnected)
    websocketService.off('error', handleError)

    // ==================== 消息相关 ==================== 
    websocketService.off('message', handleMessage)
    websocketService.off('messageAck', handleMessageAck)
    websocketService.off('messageError', handleMessageError)

    // ==================== 好友系统通知 ====================
    websocketService.off('friendRequestNotification', handleFriendRequestNotification)
    websocketService.off('friendRequestResultNotification', handleFriendRequestResultNotification)
    websocketService.off('friendDeletedNotification', handleFriendDeletedNotification)
    websocketService.off('updateOnlineState', handleUpdateOnlineState)

    // ==================== 群组系统通知 ====================
    websocketService.off('groupRequestNotification', handleGroupRequestNotification)
    websocketService.off('groupRequestResultNotification', handleGroupRequestResultNotification)
    websocketService.off('memberKickedNotification', handleMemberKickedNotification)
    websocketService.off('groupDisbandedNotification', handleGroupDisbandedNotification)
    websocketService.off('exitGroupNotification', handleExitGroupNotification)
    websocketService.off('roleChangedNotification', handleRoleChangedNotification)
    websocketService.off('groupOwnerTransferNotification', handleGroupOwnerTransferNotification)
    websocketService.off('memberMuteChangedNotification', handleMemberMuteChangedNotification)

    // ==================== 消息系统通知 ====================
    websocketService.off('messageReadNotification', handleMessageReadNotification)
    websocketService.off('messageRevokedNotification', handleMessageRevokedNotification)

    console.log('[WebSocketHandler] 所有通知处理器已清理')
  }

  return {
    setupNotificationHandlers,
    cleanupNotificationHandlers,
  }
}

// ==================== 处理函数 ====================


// ==================== 连接相关 ====================

/**
 * 处理连接成功事件
 * payload: undefined 或连接信息
 *
 * TODO: 实现逻辑
 * - 更新连接状态
 * - 可以在此处触发初始数据同步
 */
const handleConnected = (payload: any): void => {
  // TODO: 实现连接成功处理逻辑
  console.log('[WebSocketHandler] WebSocket连接已建立')
}

/**
 * 处理WebSocket错误
 * payload: 错误信息字符串
 *
 * TODO: 实现逻辑
 * - 记录错误日志
 * - 显示用户友好的错误提示
 * - 判断是否需要重连
 */
const handleError = (payload: any): void => {
  // TODO: 实现错误处理逻辑
  console.log('[WebSocketHandler] WebSocket错误:', payload)
}


// ==================== 消息相关 ====================

/**
 * 处理应用层消息（私聊/群聊）
 * payload: WSMessage = { type: Private | MesGroup, payload: BasePayload }
 *
 * 实现逻辑：
 * - 解析消息类型（Private/MesGroup）
 * - 将消息添加到 messageStore
 * - 更新会话信息
 * - 触发UI更新通知
 */
const handleMessage = async (wsMessage: WSMessage): Promise<void> => {
  try {
    const messageStore = useMessageStore()
    const authStore = useAuthStore()
    const chatStore = useChatStore()

    // 转换为 LocalMessage
    const localMessage = new LocalMessage(
      wsMessage.type,
      wsMessage.payload || {},
      MessageStatus.SENT,
      wsMessage.payload?.sender_id === authStore.userId,
    )

    // 根据消息类型添加到对应的 store
    let storeType: MessageStoreType
    switch (localMessage.type) {
      case MessageType.PRIVATE: {
        storeType = 'private'
        break
      }
      case MessageType.MESGROUP: {
        storeType = 'group'
        break
      }
      default: {
        console.warn('未知消息类型:', localMessage.type)
        return
      }
    }

    // 判断是否为当前用户发送
    localMessage.userIsSender = localMessage.payload.sender_id === authStore.userId

    // 过滤自己发送的消息（避免重复添加）
    // 发送消息时已经添加到store了，不需要再添加广播回来的消息
    if (localMessage.userIsSender) {
      console.log(`[消息] 忽略自己发送的广播消息: ${localMessage.payload.message_id}`)
      return
    }

    // 只添加别人发送的消息
    if (localMessage.payload.chat_id) {
      // 检查会话是否已存在，不存在则创建
      if (!chatStore.getChatByid(localMessage.payload.chat_id)) {
        await createChatIfNotExists(localMessage, storeType)
      }

      messageStore.addMessage(localMessage.payload.chat_id, localMessage, storeType)

      // 更新 chatStore
      // 1. 更新会话最新消息
      chatStore.updateChatLastMessageFromMessage(localMessage.payload.chat_id, localMessage)

      // 2. 增加未读数（仅当不是当前激活的会话时）
      if (chatStore.activeChatId !== localMessage.payload.chat_id) {
        chatStore.incrementUnreadCount(localMessage.payload.chat_id)
      } else {
        // 如果是当前会话，则调用已读API
        markChatAsRead(localMessage.payload.chat_id, storeType)
      }

      // 3. 检查是否被@（仅当不是当前激活的会话时）
      const mentionedUids = localMessage.payload.mentioned_uids
      if (mentionedUids && mentionedUids.length > 0) {
        const isMentioned = mentionedUids.includes(authStore.userId)
        if (isMentioned && chatStore.activeChatId !== localMessage.payload.chat_id) {
          chatStore.incrementMentionedCount(localMessage.payload.chat_id)
        }
      }
    }

    console.log(`[消息] 收到${storeType}消息:`, localMessage.payload)
  } catch (error) {
    console.error('处理接收消息失败:', error)
  }
}

/**
 * 处理消息确认通知
 * payload: MessageAckData = { type: MessageAck, payload: { temp_message_id, message_id, timestamp } }
 *
 * 实现逻辑：
 * - 从消息队列中移除对应的临时消息
 * - 更新消息状态为已发送
 * - 更新消息ID为真实ID
 * - 更新时间戳为服务器时间戳
 */
const handleMessageAck = (ackData: MessageAckData): void => {
  try {
    const messageStore = useMessageStore()
    const { temp_message_id, message_id, timestamp } = ackData.payload
    const queueMessages = messageStore.getQueueMessages()
    console.log('收到ACK:', { temp_message_id, message_id, timestamp, queueSize: queueMessages.length })
    console.log('队列中的消息IDs:', queueMessages.map(m => m.payload.message_id))

    // 从队列中查找并处理消息
    const queuedMessage = messageStore.findInMessageQueue(temp_message_id)
    if (queuedMessage) {
      // 直接修改对象属性，messageStore中的状态自动更新
      if (message_id) {
        queuedMessage.payload.message_id = message_id
      }
      // 更新时间戳为服务器时间
      if (timestamp) {
        queuedMessage.payload.timestamp = timestamp
      }
      queuedMessage.sendStatus = MessageStatus.SENT
      messageStore.removeFromMessageQueue(temp_message_id)
      console.log(`消息${temp_message_id}发送成功`)
    } else {
      console.warn('收到未知消息的ACK:', temp_message_id, 'message_id:', message_id)
    }
  } catch (error) {
    console.error('处理消息ACK失败:', error)
  }
}

/**
 * 处理消息错误通知
 * payload: MessageError = { type: MessageType, payload: { temp_message_id, error } }
 *
 * 实现逻辑：
 * - 从消息队列中查找对应的消息
 * - 更新消息状态为发送失败
 * - 从队列中移除
 * - 显示错误提示
 */
const handleMessageError = (errorData: MessageError): void => {
  try {
    const messageStore = useMessageStore()
    const { showError } = useSnackbar()

    // 检查 payload 是否存在
    if (!errorData.payload) {
      console.warn('收到错误通知，但没有 payload:', errorData)
      return
    }

    const { temp_message_id, error } = errorData.payload
    const queueMessages = messageStore.getQueueMessages()
    console.log('收到消息错误:', { temp_message_id, error, queueSize: queueMessages.length })

    // 从队列中查找并处理消息
    const queuedMessage = messageStore.findInMessageQueue(temp_message_id)
    if (queuedMessage) {
      // 更新消息状态为失败
      queuedMessage.sendStatus = MessageStatus.FAILED
      // 从队列中移除
      messageStore.removeFromMessageQueue(temp_message_id)
      console.log(`消息${temp_message_id}发送失败: ${error}`)
      // 显示错误提示
      showError(`消息发送失败: ${error}`)
    } else {
      console.warn('收到未知消息的错误通知:', temp_message_id, 'error:', error)
    }
  } catch (err) {
    console.error('处理消息错误失败:', err)
  }
}

// ==================== 好友系统通知 ====================

/**
 * 处理好友请求通知
 * payload: FriendRequestNotification = { type: FriendRequestNotification, payload: { req_id, sender_uid, sender_name, sender_avatar, receiver_uid, apply_text, create_time, status } }
 */
const handleFriendRequestNotification = (notification: FriendRequestNotification): void => {
  const friendRequestStore = useFriendRequestStore()
  const { showInfo } = useSnackbar()

  // 将 WebSocket payload 转换为 FriendRequest 对象
  const request: FriendRequest = {
    req_id: notification.payload.req_id,
    sender_uid: notification.payload.sender_uid,
    receiver_uid: notification.payload.receiver_uid,
    apply_text: notification.payload.apply_text,
    create_time: notification.payload.create_time,
    status: notification.payload.status as any,
    userProfile: {
      id: notification.payload.sender_uid,
      name: notification.payload.sender_name,
      avatar: notification.payload.sender_avatar,
    },
  }

  // 添加到 friendRequestStore
  friendRequestStore.addRequest(request)

  // 显示通知提示
  showInfo(`收到来自 ${notification.payload.sender_name} 的好友请求`)

  console.log('[WebSocketHandler] 好友请求通知已处理:', request)
}

/**
 * 处理好友请求结果通知
 * payload: FriendRequestResultNotification = { type: FriendRequestResultNotification, payload: { req_id, action, fid?, uid?, username?, avatar?, timestamp? } }
 */
const handleFriendRequestResultNotification = (notification: FriendRequestResultNotification): void => {
  const friendRequestStore = useFriendRequestStore()
  const friendStore = useFriendStore()

  // 更新请求状态
  friendRequestStore.updateRequestStatus(notification.payload.req_id, notification.payload.action as any)

  // 如果是接受请求，添加好友到 friendStore
  if (notification.payload.action === 'accept' && notification.payload.fid && notification.payload.uid) {
    const friend: FriendWithUserInfo = {
      fid: notification.payload.fid,
      id: notification.payload.uid,
      name: notification.payload.username || `用户${notification.payload.uid}`,
      avatar: notification.payload.avatar || '',
      isBlacklisted: false,
    }
    friendStore.addFriend(friend)
    const {showSuccess} = useSnackbar()
    showSuccess(`${notification.payload.username} 已同意您的好友请求`)
  }
  
  console.log('[WebSocketHandler] 好友请求结果通知已处理:', notification.payload)
}

/**
 * 处理好友删除通知
 * payload: FriendDeletedNotification = { type: FriendDeletedNotification, payload: { fid, uid, timestamp? } }
 *
 * TODO: 实现逻辑
 * - 从 friendStore 中移除好友关系
 * - 清理相关聊天记录
 * - 通知用户好友已被删除
 */
const handleFriendDeletedNotification = (notification: FriendDeletedNotification): void => {
  // TODO: 实现好友删除处理逻辑
  console.log('[WebSocketHandler] 收到好友删除通知:', notification.payload)
}

/**
 * 处理好友在线状态更新
 * payload: UpdateOnlineStateData = { type: UpdateOnlineState, payload: { uid: string, online_state: boolean } }
 *
 * 实现逻辑：
 * - 通过 uid 查找好友
 * - 更新好友的 online_state 字段
 * - 同时更新群成员的 online_state 字段
 * - UI 自动响应式更新
 */
const handleUpdateOnlineState = (notification: UpdateOnlineStateData): void => {
  const friendStore = useFriendStore()
  const groupStore = useGroupStore()
  const { uid, online_state } = notification.payload

  // 1. 更新好友在线状态
  const friend = friendStore.getFriendByUid(uid)
  if (friend) {
    friendStore.updateFriend(friend.fid, { online_state })
    console.log(`[在线状态更新] 用户 ${uid} 是好友，已更新好友状态`)
  }

  // 2. 更新群成员在线状态（遍历所有群）
  const allGroups = groupStore.allGroups
  let updatedGroupsCount = 0

  for (const group of allGroups) {
    const members = groupStore.getGroupMembers(group.id)
    if (members.some(m => m.id === uid)) {
      groupStore._updateGroupMemberOnlineStateInternal(group.id, uid, online_state)
      updatedGroupsCount++
    }
  }

  if (updatedGroupsCount > 0) {
    console.log(`[在线状态更新] 用户 ${uid} ${online_state ? '上线' : '离线'}，影响 ${updatedGroupsCount} 个群`)
  }
}

// ==================== 群组系统通知 ====================

/**
 * 处理入群申请通知
 * payload: GroupRequestNotification = { type: GroupRequestNotification, payload: { req_id, gid, group_name, applicant_uid, applicant_name, applicant_avatar, apply_text, create_time, status } }
 *
 * 实现逻辑：
 * - 将申请转换为 GroupRequest 对象
 * - 添加到 groupRequestStore 的 approvalRequests
 * - 显示入群申请通知
 */
const handleGroupRequestNotification = (notification: GroupRequestNotification): void => {
  const groupRequestStore = useGroupRequestStore()
  const { showInfo } = useSnackbar()

  // 将 WebSocket payload 转换为 GroupRequest 对象
  const request: GroupRequest = {
    req_id: notification.payload.req_id,
    gid: notification.payload.gid,
    sender_uid: notification.payload.applicant_uid,
    apply_text: notification.payload.apply_text,
    create_time: notification.payload.create_time,
    status: notification.payload.status as GroupRequestStatus,
    groupProfile: {
      id: notification.payload.gid,
      name: notification.payload.group_name,
      avatar: notification.payload.group_avatar || '',
    },
    userProfile: {
      id: notification.payload.applicant_uid,
      name: notification.payload.applicant_name,
      avatar: notification.payload.applicant_avatar || '',
    },
  }

  // 添加到 groupRequestStore
  groupRequestStore.addApprovalRequest(request)

  // 显示通知提示
  showInfo(` ${notification.payload.applicant_name} 申请加入群聊 ${notification.payload.group_name}`)

  console.log('[WebSocketHandler] 入群申请通知已处理:', request)
}

/**
 * 处理入群申请结果通知
 * payload: GroupRequestResultNotification = { type: GroupRequestResultNotification, payload: { req_id, action, gid?, group_name?, group_avatar?, group_intro?, manager_uid?, timestamp? } }
 *
 * 实现逻辑：
 * - 更新 groupRequestStore 中的申请状态
 * - 如果接受，将群组信息直接写入 groupStore 缓存
 */
const handleGroupRequestResultNotification = (notification: GroupRequestResultNotification): void => {
  const groupRequestStore = useGroupRequestStore()
  const groupStore = useGroupStore()
  const { showSuccess, showInfo } = useSnackbar()

  const { req_id, action, gid, group_name, group_avatar, group_intro } = notification.payload

  // 映射 action 到 GroupRequestStatus
  const statusMap: Record<string, GroupRequestStatus> = {
    accept: GroupRequestStatus.ACCEPTED,
    reject: GroupRequestStatus.REJECTED,
  }

  const newStatus = statusMap[action]
  if (newStatus) {
    // 更新用户申请记录状态
    groupRequestStore.updateRequestStatus(req_id, newStatus)
  }

  // 如果申请被接受且群组信息完整，直接写入缓存
  if (action === 'accept' && gid && group_name) {
    const group = {
      id: gid,
      name: group_name,
      avatar: group_avatar || '',
      group_intro: group_intro || '',
    }
    groupStore._addGroupInternal(group)
    showSuccess(`群聊：${group_name} 申请已通过`)
    console.log('[WebSocketHandler] 入群申请已接受，群组已写入缓存:', group)
  } else if (action === 'reject') {
    showInfo('入群申请已被拒绝')
  }

  console.log('[WebSocketHandler] 入群申请结果通知已处理:', { req_id, action, gid })
}

/**
 * 处理成员被踢出群通知
 * payload: MemberKickedNotification = { type: MemberKickedNotification, payload: { gid, operator_uid, kicked_uid, timestamp? } }
 *
 * TODO: 实现逻辑
 * - 判断被踢的是否是当前用户
 * - 如果是，从群组列表移除并清理聊天记录
 * - 如果不是，从群成员列表移除该成员
 */
const handleMemberKickedNotification = (notification: MemberKickedNotification): void => {
  // TODO: 实现成员被踢处理逻辑
  console.log('[WebSocketHandler] 收到成员被踢出群通知:', notification.payload)
}

/**
 * 处理群组解散通知
 * payload: GroupDisbandedNotification = { type: GroupDisbandedNotification, payload: { gid, operator_uid, timestamp? } }
 *
 * TODO: 实现逻辑
 * - 从 groupStore 中移除该群组
 * - 清理群组相关聊天记录
 * - 通知用户群组已解散
 */
const handleGroupDisbandedNotification = (notification: GroupDisbandedNotification): void => {
  // TODO: 实现群组解散处理逻辑
  console.log('[WebSocketHandler] 收到群组解散通知:', notification.payload)
}

/**
 * 处理退出群组通知
 * payload: ExitGroupNotification = { type: ExitGroupNotification, payload: { gid, uid, timestamp? } }
 *
 * TODO: 实现逻辑
 * - 判断退出的是否是当前用户
 * - 如果是，清理群组和聊天数据
 * - 如果不是，从群成员列表移除
 */
const handleExitGroupNotification = (notification: ExitGroupNotification): void => {
  // TODO: 实现退出群组处理逻辑
  console.log('[WebSocketHandler] 收到退出群组通知:', notification.payload)
}

/**
 * 处理角色变更通知
 * payload: RoleChangedNotification = { type: RoleChangedNotification, payload: { gid, uid, new_role, operator_uid, timestamp? } }
 *
 * TODO: 实现逻辑
 * - 更新 groupStore 中群成员的角色
 * - 如果是当前用户，更新UI权限显示
 */
const handleRoleChangedNotification = (notification: RoleChangedNotification): void => {
  // TODO: 实现角色变更处理逻辑
  console.log('[WebSocketHandler] 收到角色变更通知:', notification.payload)
}

/**
 * 处理群主转让通知
 * payload: GroupOwnerTransferNotification = { type: GroupOwnerTransferNotification, payload: { gid, old_owner_uid, new_owner_uid, timestamp? } }
 *
 * TODO: 实现逻辑
 * - 更新 groupStore 中的群主信息
 * - 更新群成员角色
 */
const handleGroupOwnerTransferNotification = (notification: GroupOwnerTransferNotification): void => {
  // TODO: 实现群主转让处理逻辑
  console.log('[WebSocketHandler] 收到群主转让通知:', notification.payload)
}

/**
 * 处理成员禁言/解禁通知
 * payload: MemberMuteChangedNotification = { type: MemberMuteChangedNotification, payload: { gid, uid, muted, operator_uid, timestamp? } }
 *
 * TODO: 实现逻辑
 * - 更新 groupStore 中成员的禁言状态
 * - 如果是当前用户，禁用/启用输入框
 */
const handleMemberMuteChangedNotification = (notification: MemberMuteChangedNotification): void => {
  // TODO: 实现成员禁言状态变更处理逻辑
  console.log('[WebSocketHandler] 收到成员禁言状态变更通知:', notification.payload)
}

// ==================== 消息系统通知 ====================

/**
 * 处理消息已读通知
 * payload: MessageReadNotification = { type: MessageReadNotification, payload: { chat_id,read_time } }
 *
 * 实现逻辑：
 * - 标记该聊天中 read_time 之前的所有消息为已读
 * - UI 自动响应式更新显示已读状态
 */
const handleMessageReadNotification = (notification: MessageReadNotification): void => {
  const messageStore = useMessageStore()
  const { chat_id, read_time } = notification.payload

  // 使用 store 的 markMessagesAsReadBeforeTime 方法标记已读
  messageStore.markMessagesAsReadBeforeTime(chat_id, read_time)

  console.log('[WebSocketHandler] 消息已读通知已处理:', { chat_id, read_time })
}

/**
 * 处理消息撤回通知
 * payload: MessageRevokedNotification = { type: MessageRevokedNotification, payload: { message_id, operator_uid, timestamp? } }
 *
 * 实现逻辑：
 * - 标记消息为已撤回
 * - 如果消息在队列中，标记为失败并移出队列
 * - UI 自动响应式更新显示已撤回状态
 */
const handleMessageRevokedNotification = (notification: MessageRevokedNotification): void => {
  const messageStore = useMessageStore()
  const { message_id } = notification.payload

  // 使用 store 的 markMessageAsRevoked 方法标记撤回
  messageStore.markMessageAsRevoked(message_id)

  console.log('[WebSocketHandler] 消息撤回通知已处理:', { message_id })
}

// ==================== 辅助函数 ====================

/**
 * 如果会话不存在则创建新会话
 * @param message 收到的消息
 * @param storeType 消息存储类型（private/group）
 */
const createChatIfNotExists = async (
  message: LocalMessage,
  storeType: MessageStoreType,
): Promise<void> => {
  const chatStore = useChatStore()
  const friendStore = useFriendStore()
  const groupStore = useGroupStore()
  const chatId = message.payload.chat_id!

  // 检查会话是否已存在（再次检查，避免竞态条件）
  if (chatStore.getChatByid(chatId)) {
    return
  }

  let newChat: Chat

  if (storeType === 'private') {
    // 私聊会话：从好友列表获取信息，或使用消息中的发送者信息
    const friend = friendStore.getFriendByUid(message.payload.sender_id!)
    if (friend) {
      newChat = {
        id: chatId,
        type: ChatType.PRIVATE,
        name: friend.name,
        avatar: friend.avatar,
        isPinned: false,
        unreadCount: 0,
        lastMessage: '',
        updatedAt: new Date().toISOString(),
      }
      console.log(`[WebSocketHandler] 从好友信息创建私聊会话: ${chatId}`)
    } else {
      // 好友列表中没有，使用消息中的发送者信息创建
      newChat = {
        id: chatId,
        type: ChatType.PRIVATE,
        name: message.payload.sender_name || `用户${message.payload.sender_id}`,
        avatar: message.payload.sender_avatar || '',
        isPinned: false,
        unreadCount: 0,
        lastMessage: '',
        updatedAt: new Date().toISOString(),
      }
      console.log(`[WebSocketHandler] 使用消息发送者信息创建私聊会话: ${chatId}`)
    }
  } else {
    // 群聊会话：从群组列表获取信息
    const group = groupStore.getGroupById(chatId)
    if (group) {
      newChat = {
        id: chatId,
        type: ChatType.GROUP,
        name: group.name,
        avatar: group.avatar,
        isPinned: false,
        unreadCount: 0,
        lastMessage: '',
        updatedAt: new Date().toISOString(),
      }
      console.log(`[WebSocketHandler] 从群组信息创建群聊会话: ${chatId}`)
    } else {
      // 群组列表中没有，使用默认信息创建
      newChat = {
        id: chatId,
        type: ChatType.GROUP,
        name: `群聊${chatId}`,
        avatar: '',
        isPinned: false,
        unreadCount: 0,
        lastMessage: '',
        updatedAt: new Date().toISOString(),
      }
      console.warn(`[WebSocketHandler] 群组${chatId}不在群组列表中，使用默认信息创建会话`)
    }
  }

  // 添加新会话到列表
  chatStore.addChat(newChat)
}

/**
 * 标记聊天为已读
 * 特殊防抖策略：首次立即执行，后续1秒防抖
 * @param chatId 聊天ID
 * @param storeType 消息存储类型（private/group）
 */

// 防抖状态管理
type DebounceState = {
  timer: ReturnType<typeof setTimeout> | null
  lastMessageTime: number
}

// 每个聊天ID维护独立的防抖状态
const debounceMap = new Map<string, DebounceState>()

const markChatAsRead = async (chatId: string, storeType: MessageStoreType): Promise<void> => {
  try {
    const now = Date.now()

    // 获取或创建该聊天的防抖状态
    let state = debounceMap.get(chatId)
    if (!state) {
      state = { timer: null, lastMessageTime: 0 }
      debounceMap.set(chatId, state)
    }

    // 清除之前的定时器
    if (state.timer) {
      clearTimeout(state.timer)
      state.timer = null
    }

    const executeMark = async () => {
      // 优先使用消息队列里最新一条消息的时间戳
      const messageStore = useMessageStore()
      const messages = messageStore.getMessages(chatId, storeType)

      // 计算最新消息时间戳
      let latestTimestamp = 0
      for (const message of messages) {
        // 只考虑接收到的未读消息
        if (!message.userIsSender && !message.is_read) {
          const msgTimestamp = message.payload.timestamp || 0
          if (msgTimestamp > latestTimestamp) {
            latestTimestamp = msgTimestamp
          }
        }
      }

      // 使用最新消息时间戳或当前时间
      const timestamp = latestTimestamp || Math.ceil(Date.now() / 1000)
      await messageService.markMessagesAsRead(chatId, storeType, timestamp)
      console.log(`[WebSocketHandler] 已标记聊天 ${chatId} 为已读`)
    }

    // 判断是否应该立即执行（距离上次收到消息超过2秒，或首次执行）
    const shouldExecuteImmediately = now - state.lastMessageTime > 2000

    state.lastMessageTime = now

    if (shouldExecuteImmediately) {
      // 立即执行
      await executeMark()
    } else {
      // 1秒防抖
      state.timer = setTimeout(async () => {
        await executeMark()
      }, 1000)
    }
  } catch (error) {
    console.error('标记聊天已读失败:', error)
  }
}

export default useWebSocketHandler
