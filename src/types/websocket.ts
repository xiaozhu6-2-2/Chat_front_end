/**
 * WebSocket 协议层类型定义
 * 用于 WebSocket 连接管理、心跳、消息确认等底层协议
 */

/**
 * WebSocket 事件类型
 */
export type WebSocketEventType =
  | 'message'           // 应用层消息（经过路由器分发）
  | 'messageAck'        // 消息确认
  | 'messageError'      // 消息错误
  | 'error'             // WebSocket错误
  | 'connected'         // 连接成功
  | 'disconnected'      // 连接断开
  // 好友系统通知
  | 'friendRequestNotification'
  | 'friendRequestResultNotification'
  | 'friendDeletedNotification'
  | 'updateOnlineState'
  // 群组系统通知
  | 'groupRequestNotification'
  | 'groupRequestResultNotification'
  | 'memberKickedNotification'
  | 'groupDisbandedNotification'
  | 'exitGroupNotification'
  | 'roleChangedNotification'
  | 'groupOwnerTransferNotification'
  | 'memberMuteChangedNotification'
  // 消息系统通知
  | 'messageReadNotification'
  | 'messageRevokedNotification'

// WebSocket 协议消息类型（协议层）
export enum MessageType {
  // 基础协议类型
  PRIVATE = 'Private',     // 私聊消息
  MESGROUP = 'MesGroup',   // 群聊消息
  PING = 'Ping',           // 心跳包
  PONG = 'Pong',           // 心跳响应
  MessageAck = 'MessageAck', // 消息确认

  // 好友相关
  FriendRequestNotification = 'FriendRequestNotification',           // 好友申请通知
  FriendRequestResultNotification = 'FriendRequestResultNotification', // 好友申请结果通知
  FriendDeletedNotification = 'FriendDeletedNotification',           // 好友删除通知
  UpdateOnlineState = 'UpdateOnlineState',                           // 好友在线状态更新

  // 群组相关
  GroupRequestNotification = 'GroupRequestNotification',             // 入群申请通知
  GroupRequestResultNotification = 'GroupRequestResultNotification', // 入群申请结果通知
  MemberKickedNotification = 'MemberKickedNotification',             // 成员被踢出群
  GroupDisbandedNotification = 'GroupDisbandedNotification',         // 群组解散
  ExitGroupNotification = 'ExitGroupNotification',                   // 退出群组
  RoleChangedNotification = 'RoleChangedNotification',               // 角色变更
  GroupOwnerTransferNotification = 'GroupOwnerTransferNotification', // 群主转让
  MemberMuteChangedNotification = 'MemberMuteChangedNotification',   // 成员禁言/解禁

  // 消息相关
  MessageReadNotification = 'MessageReadNotification',               // 消息已读状态更新
  MessageRevokedNotification = 'MessageRevokedNotification',         // 消息撤回通知
}

/**
 * Ping 心跳消息类
 */
export class PingMessage {
  type: 'Ping' = 'Ping'
  payload: {
    timestamp?: number
    data?: Record<string, any>
  }

  constructor (sender_id: string) {
    this.payload = {
      timestamp: Math.ceil(Date.now() / 1000),
      data: { sender_id },
    }
  }
}

/**
 * Pong 心跳响应消息类
 */
export class PongMessage {
  type: 'Pong' = 'Pong'
  payload: {
    timestamp?: number
    data?: Record<string, any>
  }

  constructor (sender_id: string) {
    this.payload = {
      timestamp: Math.ceil(Date.now() / 1000),
      data: { sender_id },
    }
  }
}

/**
 * 消息确认通知
 */
export interface MessageAckData {
  type: MessageType
  payload: {
    temp_message_id: string
    message_id: string
    timestamp: number  // 服务器时间戳
  }
}

//消息错误通知
export interface MessageError{
  type: MessageType
  payload: {
    temp_message_id: string
    error: string
  }
}

//好友在线状态变更通知
export interface UpdateOnlineStateData{
  type: MessageType
  payload: {
    uid: string
    online_state: boolean
  }
}

// 好友请求通知
//用户是接收者
export interface  FriendRequestNotification {
  type: MessageType
  payload: {
    req_id: string
    sender_uid: string
    sender_name: string
    sender_avatar: string
    receiver_uid: string
    apply_text: string
    create_time: number //秒级时间戳
    status: string
  }
}

// 好友请求结果通知
export interface FriendRequestResultNotification {
  type: MessageType.FriendRequestResultNotification
  payload: {
    req_id: string       // 请求ID
    action: 'accept' | 'reject' | 'ignore'  // 处理动作
    fid?: string         // 好友关系ID（接受时返回）
    uid?: string         // 好友用户ID（接受时返回）
    username?: string    // 好友用户名（接受时返回）
    avatar?: string      // 好友头像（接受时返回）
    timestamp?: number   // 时间戳
  }
}

// 好友删除通知
export interface FriendDeletedNotification {
  type: MessageType.FriendDeletedNotification
  payload: {
    fid: string          // 好友关系ID
    uid: string          // 被删除的好友用户ID
    timestamp?: number   // 时间戳
  }
}

// 群聊申请通知
export interface GroupRequestNotification {
  type: MessageType.GroupRequestNotification
  payload: {
    req_id: string          // 请求ID
    gid: string             // 群组ID
    group_name: string      // 群组名称
    group_avatar: string    //群头像
    applicant_uid: string   // 申请人用户ID
    applicant_name: string  // 申请人用户名
    applicant_avatar: string // 申请人头像
    apply_text: string      // 申请理由
    create_time: number     // 创建时间（秒级时间戳）
    status: string          // 状态
  }
}

// 群聊申请结果通知
export interface GroupRequestResultNotification {
  type: MessageType.GroupRequestResultNotification
  payload: {
    req_id: string       // 请求ID
    action: 'accept' | 'reject'  // 处理动作
    gid?: string         // 群组ID（接受时返回）
    group_name?: string  // 群组名称（接受时返回）
    group_avatar?: string // 群组头像（接受时返回）
    group_intro?: string // 群组简介（接受时返回）
    timestamp?: number   // 时间戳
  }
}

// 成员被踢出群通知
export interface MemberKickedNotification {
  type: MessageType.MemberKickedNotification
  payload: {
    gid: string          // 群组ID
    operator_uid: string // 操作者用户ID
    kicked_uid: string   // 被踢成员用户ID
    timestamp?: number   // 时间戳
  }
}

// 群组解散通知
export interface GroupDisbandedNotification {
  type: MessageType.GroupDisbandedNotification
  payload: {
    gid: string          // 群组ID
    operator_uid: string // 操作者用户ID（群主）
    timestamp?: number   // 时间戳
  }
}

// 退出群组通知
export interface ExitGroupNotification {
  type: MessageType.ExitGroupNotification
  payload: {
    gid: string          // 群组ID
    uid: string          // 退出成员用户ID
    timestamp?: number   // 时间戳
  }
}

// 角色变更通知
export interface RoleChangedNotification {
  type: MessageType.RoleChangedNotification
  payload: {
    gid: string          // 群组ID
    uid: string          // 被修改角色的成员用户ID
    new_role: 'admin' | 'member'  // 新角色
    operator_uid: string // 操作者用户ID
    timestamp?: number   // 时间戳
  }
}

// 群主转让通知
export interface GroupOwnerTransferNotification {
  type: MessageType.GroupOwnerTransferNotification
  payload: {
    gid: string              // 群组ID
    old_owner_uid: string    // 原群主用户ID
    new_owner_uid: string    // 新群主用户ID
    timestamp?: number       // 时间戳
  }
}

// 成员禁言/解禁通知
export interface MemberMuteChangedNotification {
  type: MessageType.MemberMuteChangedNotification
  payload: {
    gid: string          // 群组ID
    uid: string          // 被禁言/解禁成员用户ID
    muted: boolean       // 是否禁言
    operator_uid: string // 操作者用户ID
    timestamp?: number   // 时间戳
  }
}

// 私聊消息已读通知
export interface MessageReadNotification {
  type: MessageType.MessageReadNotification
  payload: {
    chat_id: string      // 聊天ID（私聊为 fid，群聊为 gid）
    read_time: number    // 已读时间戳（该时间之前的消息均已读）
  }
}

// 消息撤回通知
export interface MessageRevokedNotification {
  type: MessageType.MessageRevokedNotification
  payload: {
    message_id: string   // 被撤回的消息ID
    operator_uid: string // 操作者用户ID
    timestamp?: number   // 时间戳
  }
}



