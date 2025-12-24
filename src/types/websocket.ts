/**
 * WebSocket 协议层类型定义
 * 用于 WebSocket 连接管理、心跳、消息确认等底层协议
 */

/**
 * WebSocket 事件类型
 */
export type WebSocketEventType =
  | 'message'       // 应用层消息（经过路由器分发）
  | 'messageAck'    // 消息确认
  | 'error'
  | 'connected'
  | 'disconnected'

// WebSocket 协议消息类型（协议层）
export enum MessageType {
  PRIVATE = 'Private',  //私聊消息
  MESGROUP = 'MesGroup',  //群聊消息
  PING = 'Ping',           // 心跳包
  PONG = 'Pong',           // 心跳响应
  MessageAck = 'MessageAck',   // 消息确认
  UpdateOnlineState = 'UpdateOnlineState', //在线状态更新通知
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
      timestamp: Math.floor(Date.now() / 1000),
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
      timestamp: Math.floor(Date.now() / 1000),
      data: { sender_id },
    }
  }
}

/**
 * 消息确认通知
 */
export interface MessageAckData {
  tempId: String
  realId: String
}

export interface MessageError{
  temp_message_id: String
  error: String
}

export interface UpdateOnlineStateData{
  uid: String
  online_state: Boolean
}




