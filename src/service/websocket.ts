// service/websocket.ts

// 实现说明：
// 1. 关于验证：建立ws时url附带了参数token，服务端根据token进行验证，验证通过后才建立ws连接。
// 2. 关于消息处理，除了心跳，其余直接传入到messageHandler进行下一步处理

// 待处理：
// 启动后端检验心跳
// isManualDisconnect设置有缺陷
// pong消息需要检查时间戳来重置计时器

import { ref, type Ref } from 'vue'

import { WSMessage, localToWS, type LocalMessage } from '@/types/message'
import {
  MessageType,
  PingMessage,
  PongMessage,
  type WebSocketEventType,
  type MessageAckData,
  type FriendDeletedNotification,
  type FriendRequestNotification,
  type FriendRequestResultNotification,
  type ExitGroupNotification,
  type GroupDisbandedNotification,
  type GroupOwnerTransferNotification,
  type GroupRequestNotification,
  type GroupRequestResultNotification,
  type MemberKickedNotification,
  type MemberMuteChangedNotification,
  type MessageReadNotification,
  type MessageRevokedNotification,
  type RoleChangedNotification,
  type UpdateOnlineStateData,
} from '@/types/websocket'

// 环境变量配置
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/auth/connection/ws'
const WS_HEARTBEAT_INTERVAL = Number(import.meta.env.VITE_WS_HEARTBEAT_INTERVAL) || 30_000
const WS_RECONNECT_DELAY = Number(import.meta.env.VITE_WS_RECONNECT_DELAY) || 5_000
const WS_MAX_RECONNECT_ATTEMPTS = Number(import.meta.env.VITE_WS_MAX_RECONNECT_ATTEMPTS) || 5
const WS_TIMEOUT = Number(import.meta.env.VITE_WS_TIMEOUT) || 10_000
const WS_ALIVE_TIMEOUT = Number(import.meta.env.VITE_WS_ALIVE_TIMEOUT) || 120_000

/**
 * WebSocket服务配置接口
 */
interface WebSocketConfig {
  url: string
  heartbeatInterval: number // 心跳间隔(ms)
  reconnectDelay: number // 重连基础延迟(ms)
  maxReconnectAttempts: number // 最大重连次数
  timeout: number // 连接超时(ms)
  aliveTimeout: number // 心跳检测超时(ms)
}

/**
 * WebSocket连接状态类型
 */
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting'

/**
 * Message ACK 事件数据
 */
interface MessageAckEvent {
  tempId: string
  realId: string
}

class WebSocketService {
  // ========== 核心属性 ==========

  /** WebSocket实例 */
  private ws: WebSocket | undefined = undefined

  /** 服务配置 */
  private config: WebSocketConfig

  /** 用户认证token */
  private token: string | undefined = undefined

  /** 发送者ID */
  private senderId: string | undefined = undefined

  // ========== 计时器管理 ==========

  /** 心跳计时器 */
  private heartbeatTimer: number | undefined = undefined

  /** 重连计时器 */
  private reconnectTimer: number | undefined = undefined

  /** 连接超时计时器 */
  private connectionTimer: number | undefined = undefined

  /** 心跳检测超时计时器 */
  private aliveTimer: number | undefined = undefined

  // ========== 状态管理 ==========

  /** 是否手动断开连接 */
  private isManualDisconnect = false

  /** 当前重连尝试次数 */
  private reconnectAttempts = 0

  /** 事件处理器映射表 */
  private eventHandlers: Map<WebSocketEventType, Function[]> = new Map()

  // ========== 响应式状态（供Vue组件使用） ==========

  /** 连接状态 */
  public connectionState: Ref<ConnectionState> = ref('disconnected')

  /** 最后活动时间 */
  public lastActivity: Ref<Date> = ref(new Date())

  /** 错误信息 */
  public error: Ref<string> = ref('')

  /** 网络延迟 */
  public latency: Ref<number> = ref(0)

  constructor (config: Partial<WebSocketConfig> = {}) {
    this.config = {
      url: WS_URL,
      heartbeatInterval: WS_HEARTBEAT_INTERVAL,
      reconnectDelay: WS_RECONNECT_DELAY,
      maxReconnectAttempts: WS_MAX_RECONNECT_ATTEMPTS,
      timeout: WS_TIMEOUT,
      aliveTimeout: WS_ALIVE_TIMEOUT,
      ...config,
    }
  }

  // ========== 公共API方法 ==========

  /**
   * 建立WebSocket连接
   */
  // 异步函数，因为结果需要等待事件的监听，让事件监听函数返回一个promise来结束connect函数
  async connect (token: string, senderId: string): Promise<void> {
    // 保存用户信息
    this.token = token
    this.senderId = senderId

    // 清理旧连接
    this.cleanup()

    // 构建带认证参数的URL
    // encodeURIComponent 将字符串转为安全的url编码，防止恶意注入
    const authUrl = `${this.config.url}?token=${encodeURIComponent(token)}`

    this.ws = new WebSocket(authUrl)
    this.connectionState.value = 'connecting'

    const currentWs = this.ws

    // 使用一个 Promise 来处理整个连接流程，确保连接成功或失败后才继续
    try {
      const connectionPromise = new Promise<void>((resolve, reject) => {
        // 检查连接是否已打开（如果非常快）
        if (currentWs.readyState === WebSocket.OPEN) {
          this.cleanupTimers()
          return resolve()
        }

        // 设置连接超时
        this.connectionTimer = setTimeout(() => {
          currentWs.close()
          reject(new Error('WS建立连接超时'))
        }, this.config.timeout) as unknown as number

        // 注册一次性事件监听器来处理连接结果
        currentWs.addEventListener('open', () => {
          this.cleanupTimers()
          this.connectionTimer = undefined
          resolve()
        })

        currentWs.onerror = error => {
          this.cleanupTimers()
          this.connectionTimer = undefined
          reject(error)
        }

        currentWs.addEventListener('close', event => {
          this.cleanupTimers()
          this.connectionTimer = undefined
          reject(new Error(`WebSocket connection failed during setup: ${event.code} - ${event.reason}`))
        })
      })

      // 等待 Promise 完成
      await connectionPromise

      // 取消一次性事情
      currentWs.onopen = null
      currentWs.onerror = null
      currentWs.onclose = null

      // 如果连接成功，执行后续逻辑
      this.handleOpen()// onopen已经用于判断连接是否成功，这里需要手动调用从而初始化。
      this.registerEvents()
    } catch (error) {
      this.cleanup()
      throw error
    }
  }

  /**
   * 断开WebSocket连接
   */
  disconnect (reconnectFlag: boolean, reason: string): void {
    if (reconnectFlag) {
      this.isManualDisconnect = !reconnectFlag
    }

    this.connectionState.value = 'disconnected'
    // 清理所有计时器
    this.cleanupTimers()

    const disconnectedMessage = JSON.stringify({
      type: 'disconnect',
      data: { reason },
    })

    // 发送断开通知
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(disconnectedMessage)
      } catch {
        console.error('WS关闭通知发送失败')
      }
    }

    // 关闭连接
    if (this.ws) {
      this.ws.close(1000, `Disconnect: ${reason}`)// 可以添加事件监听器追踪close事件
    }

    // 重置重连次数
    this.reconnectAttempts = 0

    console.log(`WebSocket disconnected: ${reason}`)
  }

  /**
   * 快速断开连接（用于页面关闭等紧急情况）
   */
  quickDisconnect (): void {
    this.isManualDisconnect = true
    this.cleanupTimers()

    if (this.ws) {
      this.ws.close(1000, 'Quick disconnect')
      this.ws = undefined
    }
  }

  /**
   * 发送消息
   */
  send (message: LocalMessage): void {
    if (this.isConnected) {
      // 将 LocalMessage 转换为 WSMessage 格式后发送
      const wsMessage = localToWS(message)
      this.ws?.send(JSON.stringify(wsMessage))
      console.log('WS发送消息:', wsMessage.type, 'message_id:', wsMessage.payload.message_id)
    } else {
      // 连接断开，抛出异常，由调用方处理
      console.error('WebSocket未连接，无法发送消息')
      throw new Error('WebSocket未连接，无法发送消息')
    }
  }

  // ========== 状态查询方法 ==========

  /**
   * 检查是否已连接
   */
  get isConnected (): boolean {
    return this.ws?.readyState === WebSocket.OPEN
      && this.connectionState.value === 'connected'
  }

  // ========== 事件注册方法 ==========

  /**
   * 注册事件处理器
   */
  on (event: WebSocketEventType, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event)?.push(handler)
  }

  /**
   * 移除事件处理器
   */
  off (event: WebSocketEventType, handler?: Function): void {
    if (handler) {
      const handlers = this.eventHandlers.get(event)
      if (handlers) {
        const index = handlers.indexOf(handler)
        if (index !== -1) {
          handlers.splice(index, 1)
        }
      }
    } else {
      this.eventHandlers.delete(event)
    }
  }

  // ========== 私有方法 ==========
  /**
   * 注册WebSocket事件处理器——每次连接都需要的持久事件
   */
  private registerEvents (): void {
    if (this.ws) {
      this.ws.onmessage = event => {
        this.handleMessage(event.data)
      }

      this.ws.addEventListener('close', event => {
        this.handleClose(event)
      })

      this.ws.onerror = error => {
        this.handleError('WS连接出错')
      }
    } else {
      console.error('尝试为空的ws注册事件')
    }
  }

  // 统一移除事件监听器
  private removeEvents (): void {
    const currentWs = this.ws
    if (currentWs) {
      currentWs.onmessage = null
      currentWs.onmessage = null
      currentWs.onclose = null
      currentWs.onerror = null
    }
  }

  private handleOpen (): void {
    console.log('WS连接建立成功')
    this.connectionState.value = 'connected'
    this.lastActivity.value = new Date()
    this.reconnectAttempts = 0
    this.cleanupTimers()

    // 开始心跳机制
    try {
      this.startHeartbeat()
    } catch {
      console.error('WS心跳启动失败')
    }

    // 触发连接成功事件
    this.dispatchEvent('connected')
  }

  /**
   * 处理连接关闭事件
   */
  private handleClose (event: CloseEvent): void {
    console.log(`WS连接关闭: ${event.code}--${event.reason}`)
    this.connectionState.value = 'disconnected'
    this.stopHeartbeat()

    // // 关闭组件自定义事件
    // this.dispatchEvent('disconnected', {
    //   code: event.code,
    //   reason: event.reason
    // });

    this.cleanupTimers()

    this.removeEvents()

    this.ws = undefined

    // 判断是否需要重连
    if (!this.isManualDisconnect
      && event.code !== 1000 // 正常关闭
      && this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnect()
    } else {
      this.cleanup()
    }
  }

  /**
   * 处理错误事件
   */
  private handleError (errorMsg: string): void {
    console.error('WebSocket error:', errorMsg)
    this.error.value = errorMsg
    this.dispatchEvent('error', errorMsg)
  }

  /**
   * 重置心跳超时计时器
   * 每次发送Ping时调用，设置120秒超时保护
   */
  private resetAliveTimer (): void {
    if (this.aliveTimer) {
      clearTimeout(this.aliveTimer)
      this.aliveTimer = undefined
    }

    this.aliveTimer = setTimeout(() => {
      console.warn(`[心跳] 超时 (${this.config.aliveTimeout / 1000}s 内未收到 Pong)，关闭连接`)
      // 直接关闭连接，让 handleClose 处理重连逻辑
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.close(1000, 'heartbeat_timeout')
      }
    }, this.config.aliveTimeout) as unknown as number
  }

  /**
   * 开始心跳机制
   */
  private startHeartbeat (): void {
    this.stopHeartbeat()
    if (!this.senderId) {
      console.error('未获取到userId，无法发送心跳')
      throw new Error('未获取到userId，无法发送心跳')
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
        // 每次发送时创建新的 PingMessage，确保时间戳是最新的
        const messagePing: PingMessage = new PingMessage(this.senderId!)

        // 发送Ping时重置超时计时器
        this.resetAliveTimer()

        console.log(`[心跳] 发送 Ping (timestamp: ${messagePing.payload.timestamp})`)
        try {
          this.ws.send(JSON.stringify(messagePing))
        } catch (error) {
          console.error('[心跳] 发送 Ping 失败:', error)
        }
      }
    }, this.config.heartbeatInterval) as unknown as number
  }

  /**
   * 停止心跳机制
   */
  private stopHeartbeat (): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = undefined
    }
  }

  /**
   * 处理接收到的消息
   * 先解析 type，再根据类型转换为具体接口并传递
   */
  private handleMessage (rawData: string): void {
    try {
      // 先解析为通用结构，只获取 type 字段
      const rawMessage = JSON.parse(rawData) as { type: string; payload: any }

      // 日志：记录所有接收到的原始消息（除了心跳）
      if (rawMessage.type !== 'Pong' && rawMessage.type !== 'Ping') {
        console.log('[WS收到消息] type:', rawMessage.type, '原始数据:', rawMessage)
      }

      // 更新最后活动时间
      this.lastActivity.value = new Date()

      // 根据消息类型进行分发和类型转换
      switch (rawMessage.type) {
        case 'Pong': {
          const pongTimestamp = rawMessage.payload?.timestamp
          const currentTimestamp = Math.floor(Date.now() / 1000)
          const latency = currentTimestamp - (pongTimestamp || 0)
          console.log(`[心跳] 收到 Pong (timestamp: ${pongTimestamp}, 延迟: ${latency}s)`)
          if (this.aliveTimer) {
            clearTimeout(this.aliveTimer)
            this.aliveTimer = undefined
          }
          break
        }
        case 'Ping': {
          console.log('[心跳] 收到 Ping，回复 Pong')
          try {
            if (this.senderId) {
              const messagePong: PongMessage = new PongMessage(this.senderId!)
              if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify(messagePong))
              }
            }
          } catch {
            console.error('[心跳] 发送 Pong 失败')
          }
          break
        }
        case 'MessageAck': {
          console.log('[WS处理ACK] 原始数据:', rawMessage, '提取的temp_id:', rawMessage.payload?.temp_message_id, 'msg_id:', rawMessage.payload?.message_id)
          const ackData: MessageAckData = {
            type: MessageType.MessageAck,
            payload: {
              temp_message_id: rawMessage.payload?.temp_message_id,
              message_id: rawMessage.payload?.message_id,
            },
          }
          this.dispatchEvent('messageAck', ackData)
          break
        }
        case 'MessageError': {
          const tempId = rawMessage.payload?.temp_message_id
          const error = rawMessage.payload?.error
          this.dispatchEvent('messageError', { tempId, error })
          break
        }
        // Private 和 Group 消息处理
        case 'Private':
        case 'MesGroup': {
          const message: WSMessage = new WSMessage(
            rawMessage.type as MessageType,
            rawMessage.payload,
          )
          this.dispatchEvent('message', message)
          break
        }
        // ==================== 好友系统通知 ====================
        case MessageType.FriendRequestNotification: {
          const notification: FriendRequestNotification = rawMessage as FriendRequestNotification
          this.dispatchEvent('friendRequestNotification', notification)
          break
        }
        case MessageType.FriendRequestResultNotification: {
          const notification: FriendRequestResultNotification = rawMessage as FriendRequestResultNotification
          this.dispatchEvent('friendRequestResultNotification', notification)
          break
        }
        case MessageType.FriendDeletedNotification: {
          const notification: FriendDeletedNotification = rawMessage as FriendDeletedNotification
          this.dispatchEvent('friendDeletedNotification', notification)
          break
        }
        case MessageType.UpdateOnlineState: {
          const notification: UpdateOnlineStateData = rawMessage as UpdateOnlineStateData
          this.dispatchEvent('updateOnlineState', notification)
          break
        }
        // ==================== 群组系统通知 ====================
        case MessageType.GroupRequestNotification: {
          const notification: GroupRequestNotification = rawMessage as GroupRequestNotification
          this.dispatchEvent('groupRequestNotification', notification)
          break
        }
        case MessageType.GroupRequestResultNotification: {
          const notification: GroupRequestResultNotification = rawMessage as GroupRequestResultNotification
          this.dispatchEvent('groupRequestResultNotification', notification)
          break
        }
        case MessageType.MemberKickedNotification: {
          const notification: MemberKickedNotification = rawMessage as MemberKickedNotification
          this.dispatchEvent('memberKickedNotification', notification)
          break
        }
        case MessageType.GroupDisbandedNotification: {
          const notification: GroupDisbandedNotification = rawMessage as GroupDisbandedNotification
          this.dispatchEvent('groupDisbandedNotification', notification)
          break
        }
        case MessageType.ExitGroupNotification: {
          const notification: ExitGroupNotification = rawMessage as ExitGroupNotification
          this.dispatchEvent('exitGroupNotification', notification)
          break
        }
        case MessageType.RoleChangedNotification: {
          const notification: RoleChangedNotification = rawMessage as RoleChangedNotification
          this.dispatchEvent('roleChangedNotification', notification)
          break
        }
        case MessageType.GroupOwnerTransferNotification: {
          const notification: GroupOwnerTransferNotification = rawMessage as GroupOwnerTransferNotification
          this.dispatchEvent('groupOwnerTransferNotification', notification)
          break
        }
        case MessageType.MemberMuteChangedNotification: {
          const notification: MemberMuteChangedNotification = rawMessage as MemberMuteChangedNotification
          this.dispatchEvent('memberMuteChangedNotification', notification)
          break
        }
        // ==================== 消息系统通知 ====================
        case MessageType.MessageReadNotification: {
          const notification: MessageReadNotification = rawMessage as MessageReadNotification
          this.dispatchEvent('messageReadNotification', notification)
          break
        }
        case MessageType.MessageRevokedNotification: {
          const notification: MessageRevokedNotification = rawMessage as MessageRevokedNotification
          this.dispatchEvent('messageRevokedNotification', notification)
          break
        }
        default: {
          console.warn('[WebSocket] 未知消息类型:', rawMessage.type)
        }
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error)
      this.handleError('Message parsing failed')
    }
  }

  /**
   * 分发事件到处理器
   */
  private dispatchEvent (event: WebSocketEventType, data?: any): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data)
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error)
        }
      }
    }
  }

  /**
   * 安排重连
   */
  private scheduleReconnect (): void {
    if (this.reconnectTimer) {
      return
    }

    const delay = this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts)
    this.reconnectAttempts++

    console.log(`WS计划重启 (第 ${this.reconnectAttempts} 次) 尝试重连时间：${delay}ms`)

    this.connectionState.value = 'reconnecting'
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined
      if (this.token && this.senderId) {
        this.connect(this.token, this.senderId).catch(error => {
          console.error('重连失败:', error)
        })
      }
    }, delay) as unknown as number
  }

  /**
   * 清理所有计时器
   */
  private cleanupTimers (): void {
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer)
      this.connectionTimer = undefined
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = undefined
    }

    if (this.aliveTimer) {
      clearTimeout(this.aliveTimer)
      this.aliveTimer = undefined
    }

    this.stopHeartbeat()
  }

  /**
   * 完全清理资源
   */
  private cleanup (): void {
    this.cleanupTimers()
    this.isManualDisconnect = false
    this.reconnectAttempts = 0
    this.removeEvents()
    this.ws = undefined
  }
}

// 创建单例实例
export const websocketService = new WebSocketService()

export default WebSocketService
