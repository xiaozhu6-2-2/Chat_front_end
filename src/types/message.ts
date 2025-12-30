//types/message用于群聊/私聊消息
import { MessageType } from "./websocket"

// 消息内容类型定义
export enum ContentType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  VOICE = 'voice',
  VIDEO = 'video',
  SYSTEM = 'system',
  FRIEND = 'friend',
}

// 消息状态定义
export enum MessageStatus {
  PENDING = 'pending', // 等待发送
  SENDING = 'sending', // 发送中
  SENT = 'sent', // 已发送
  DELIVERED = 'delivered', // 已送达
  READ = 'read', // 已读
  FAILED = 'failed', // 发送失败
}

/**
 * 基础消息载荷接口
 * Base payload interface for all messages
 * 字段命名采用下划线风格，与 API 保持一致
 */
export interface BasePayload {
  // 消息元数据
  message_id?: string // 消息ID
  chat_id?: string // pid 或 gid
  timestamp?: number // send_time 的毫秒时间戳

  // 发送者信息
  sender_id?: string // sender_id
  sender_name?: string // 发送时记录
  sender_avatar?: string // 发送时记录

  // 接收者信息
  receiver_id?: string // 接收者ID

  // 消息内容
  content_type?: string // text/file/img
  detail?: string // 消息文本或url

  // 实时消息状态
  is_announcement?: boolean | null // 是否是群公告
  mentioned_uids?: string[] | null // 可选，@的用户列表，对应 mentioned_uids，前端发送时解析@
  quote_msg_id?: string | null // 可选，引用的消息ID，对应quote_msg_id
}

/**
 * WebSocket 消息类
 * Base class for WebSocket messages
 */
export class WSMessage {
  type: MessageType
  payload: BasePayload

  constructor (type: MessageType, payload: BasePayload) {
    this.type = type
    this.payload = { ...payload }

    // 自动生成 message_id
    if (!this.payload.message_id) {
      this.payload.message_id = `${Date.now()}${Math.floor(Math.random() * 10_000)}`
    }

    // 自动生成 timestamp（秒级时间戳，与后端保持一致）
    if (!this.payload.timestamp) {
      this.payload.timestamp = Math.floor(Date.now() / 1000)
    }
  }

  /**
   * 打印消息信息
   */
  print (): void {
    console.log(`WSMessage - type: ${this.type}, payload:`, this.payload)
  }

  /**
   * 验证消息完整性
   */
  validate (): boolean {
    const requiredFields = [
      this.type,
      this.payload.message_id,
      this.payload.timestamp,
    ]
    return requiredFields.every(field => field != null && field !== '')
  }
}

/**
 * API 消息类（继承 WSMessage）
 * 用于API拉取，包含后端维护的消息状态
 */
export class ApiMessage extends WSMessage {
  // 后端维护的消息状态，全部可选
  is_revoked?: boolean // 撤回状态
  is_read?: boolean // 是否已读 (true=已读, false/undefined=未读)
  read_count?: number // 已读人数（群聊）

  constructor (type: MessageType, payload: BasePayload) {
    super(type, payload)
  }

  /**
   * 从 API 响应创建实例
   */
  static fromApiResponse (response: Record<string, any>): ApiMessage {
    const message = new ApiMessage(response.type, response.payload)
    // 设置后端维护的状态
    message.is_revoked = response.is_revoked
    message.is_read = response.is_read
    message.read_count = response.read_count
    return message
  }
}

/**
 * 本地消息类（继承 ApiMessage）
 * Local message class for frontend usage
 */
export class LocalMessage extends ApiMessage {
  // 前端字段
  sendStatus?: MessageStatus
  userIsSender?: boolean
  retryCount?: number // 重试次数计数器

  constructor (
    type: MessageType,
    payload: BasePayload,
    sendStatus?: MessageStatus,
    userIsSender?: boolean,
  ) {
    super(type, payload)
    this.sendStatus = sendStatus || MessageStatus.PENDING
    this.userIsSender = userIsSender || false
    this.retryCount = 0 // 初始化重试次数为 0
  }

  /**
   * 更新发送状态
   */
  updateSendStatus (status: MessageStatus, failedReason?: string): void {
    this.sendStatus = status
  }

  /**
   * 检查是否可以重发
   */
  canRetry (): boolean {
    return this.sendStatus === MessageStatus.FAILED
  }

  /**
   * 保存前检查
   */
  saveCheck (): boolean {
    const baseValidation = this.validate()
    const requiredLocalFields = [
      this.payload.sender_id,
      this.payload.chat_id,
    ]
    return baseValidation && requiredLocalFields.every(field => field != null && field !== '')
  }

  /**
   * 打印本地消息信息
   */
  print (): void {
    console.log('LocalMessage:', {
      type: this.type,
      payload: this.payload,
      sendStatus: this.sendStatus,
      userIsSender: this.userIsSender,
    })
  }
}

/**
 * 数据转换函数：WSMessage 转 ApiMessage
 * Convert WebSocket message to API message
 */
export function wsToApiMessage (wsMessage: WSMessage): ApiMessage {
  return new ApiMessage(
    wsMessage.type,
    wsMessage.payload,
  )
}

/**
 * 数据转换函数：ApiMessage 转 LocalMessage
 * Convert API message to local message
 */
export function apiMessageToLocal (
  apiMessage: ApiMessage,
  sendStatus?: MessageStatus,
  userIsSender?: boolean,
): LocalMessage {
  const localMessage = new LocalMessage(
    apiMessage.type,
    apiMessage.payload,
    sendStatus || MessageStatus.SENT,
    userIsSender || false,
  )
  // 保留 API 返回的状态字段
  localMessage.is_read = apiMessage.is_read
  localMessage.is_revoked = apiMessage.is_revoked
  localMessage.read_count = apiMessage.read_count
  return localMessage
}

/**
 * 数据转换函数：LocalMessage 转 WSMessage
 * Convert local message to WebSocket message
 *
 * 注意：需要将前端可能为 null 的字段转换为后端期望的默认值
 * 后端 MesPayload 要求：
 * - is_announcement: bool (非 null)
 * - mentioned_uids: Vec<String> (非 null，应为空数组)
 * - quote_msg_id: String (非 null，应为空字符串)
 */
export function localToWS (localMessage: LocalMessage): WSMessage {
  // 创建修复后的 payload，将 null 值替换为后端期望的默认值
  const fixedPayload = {
    ...localMessage.payload,
    is_announcement: localMessage.payload.is_announcement ?? false,
    mentioned_uids: localMessage.payload.mentioned_uids ?? [],
    quote_msg_id: localMessage.payload.quote_msg_id ?? '',
  }

  const wsMessage = new WSMessage(localMessage.type, fixedPayload)
  // 保留原有的 message_id 和 timestamp
  wsMessage.payload.message_id = localMessage.payload.message_id
  wsMessage.payload.timestamp = localMessage.payload.timestamp
  return wsMessage
}

/**
 * 批量转换：API 消息数组转本地消息数组
 */
export function batchApiToLocal (
  apiMessages: ApiMessage[],
  currentUserId: string,
): LocalMessage[] {
  return apiMessages.map(apiMsg =>
    apiMessageToLocal(
      apiMsg,
      MessageStatus.SENT,
      apiMsg.payload.sender_id === currentUserId,
    ),
  )
}

/**
 * API 响应转换为 LocalMessage
 * 用于将后端 API 返回的消息数据转换为前端使用的 LocalMessage
 *
 * @param apiResponse API 返回的原始消息数据
 * @param currentUserId 当前用户ID，用于判断是否为发送者
 * @returns LocalMessage 实例
 */
export function apiResponseToLocalMessage (
  apiResponse: any,
  currentUserId: string,
): LocalMessage {
  // 创建 ApiMessage 实例
  const apiMessage = new ApiMessage(
    apiResponse.type as MessageType,
    apiResponse.payload as BasePayload,
  )

  // 设置后端维护的状态
  apiMessage.is_revoked = apiResponse.is_revoked
  apiMessage.is_read = apiResponse.is_read
  apiMessage.read_count = apiResponse.read_count

  // 转换为 LocalMessage
  return apiMessageToLocal(
    apiMessage,
    MessageStatus.SENT,
    apiResponse.payload?.sender_id === currentUserId,
  )
}

/**
 * 批量转换 API 响应到 LocalMessage 数组
 * 用于处理历史消息列表的批量转换
 *
 * @param apiResponses API 返回的消息数组
 * @param currentUserId 当前用户ID
 * @returns LocalMessage 数组
 */
export function batchApiResponseToLocalMessages (
  apiResponses: any[],
  currentUserId: string,
): LocalMessage[] {
  return apiResponses.map(apiResponse =>
    apiResponseToLocalMessage(apiResponse, currentUserId),
  )
}

/**
 * 创建文本消息的便捷函数
 * 注意：message_id 和 timestamp 会自动生成
 */
export function createTextMessage (
  type: MessageType.PRIVATE | MessageType.MESGROUP,
  sender_id: string,
  sender_name: string,
  sender_avatar: string,
  receiver_id: string,
  content: string,
  chat_id: string,
  userIsSender?: boolean,
  is_announcement?: boolean,
  mentioned_uids?: string[] | null,
  quote_msg_id?: string | null,
): LocalMessage {
  const payload: BasePayload = {
    sender_id,
    sender_name,
    sender_avatar,
    receiver_id,
    chat_id,
    content_type: ContentType.TEXT,
    detail: content,
    is_announcement: is_announcement ?? false,
    mentioned_uids: mentioned_uids ?? null,
    quote_msg_id: quote_msg_id ?? null,
  }

  return new LocalMessage(type, payload, MessageStatus.PENDING, userIsSender)
}

/**
 * 创建文件消息的便捷函数
 * 注意：message_id 和 timestamp 会自动生成
 */
export function createFileMessage (
  type: MessageType.PRIVATE | MessageType.MESGROUP,
  sender_id: string,
  sender_name: string,
  sender_avatar: string,
  receiver_id: string,
  file_id: string,
  file_name: string,
  file_url: string,
  chat_id: string,
  userIsSender?: boolean,
  file_size?: number,
  mime_type?: string,
): LocalMessage {
  // 根据MIME类型判断内容类型
  const contentType = mime_type?.startsWith('image/')
    ? ContentType.IMAGE
    : ContentType.FILE

  // detail字段：对于文件，使用 file_id（与图片消息使用URL的方式一致）
  const detail = file_id

  const payload: BasePayload = {
    sender_id,
    sender_name,
    sender_avatar,
    receiver_id,
    chat_id,
    content_type: contentType,
    detail,
    is_announcement: false,
    mentioned_uids: null,
    quote_msg_id: null,
  }

  return new LocalMessage(type, payload, MessageStatus.PENDING, userIsSender)
}
