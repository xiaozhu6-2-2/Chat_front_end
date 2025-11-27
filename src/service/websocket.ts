//service/websocket.ts

//实现说明：
//1. 关于验证：建立ws时url附带了参数token，服务端根据token进行验证，验证通过后才建立ws连接。
//2. 关于消息处理，除了心跳，其余直接传入到messageHandler进行下一步处理

//待处理：
//启动后端检验心跳
//isManualDisconnect设置有缺陷
//pong消息需要检查时间戳来重置计时器
//消息队列未完善
//事件处理器未完善

import { ref, type Ref } from 'vue';
import type { Message, LocalMessage } from './messageTypes';
import { MessagePing, MessagePong, MessageStatus, MessageType } from './messageTypes';
import { messageService } from './message';
import { useFriendStore } from '@/stores/friendStore';
import type { FriendNotificationDetail } from './messageTypes';

/**
 * WebSocket服务配置接口
 */
interface WebSocketConfig {
  url: string;
  heartbeatInterval: number;    // 心跳间隔(ms)
  reconnectDelay: number;       // 重连基础延迟(ms)
  maxReconnectAttempts: number; // 最大重连次数
  timeout: number;              // 连接超时(ms)
  aliveTimeout: number;     // 心跳检测超时(ms)
  messageQueueTimeout: number; //缓冲队列轮询间隔
  ackTimeout: number;
}

/**
 * WebSocket连接状态类型
 */
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

class WebSocketService {
  // ========== 核心属性 ==========
  
  /** WebSocket实例 */
  private ws: WebSocket | undefined = undefined;
  
  /** 服务配置 */
  private config: WebSocketConfig;
  
  /** 用户认证token */
  private token: string | undefined = undefined;

  /** 发送者ID */
  private senderId: string | undefined = undefined;
  
  // ========== 计时器管理 ==========
  
  /** 心跳计时器 */
  private heartbeatTimer: number | undefined = undefined;
  
  /** 重连计时器 */
  private reconnectTimer: number | undefined = undefined;
  
  /** 连接超时计时器 */
  private connectionTimer: number | undefined = undefined;

  /** 心跳检测超时计时器 */
  private aliveTimer: number | undefined = undefined;

  /* 消息缓冲队列轮询计时器 */
  private messageQueueTimer: number | undefined = undefined;
  
  // ========== 状态管理 ==========
  
  /** 是否手动断开连接 */
  private isManualDisconnect: boolean = false;
  
  /** 当前重连尝试次数 */
  private reconnectAttempts: number = 0;
  
  /** 消息队列（连接断开时缓存消息） */
  private messageQueue: Array<LocalMessage> = [];
  
  /** 事件处理器映射表 */
  private eventHandlers: Map<string, Function[]> = new Map();
  
  // ========== 响应式状态（供Vue组件使用） ==========
  
  /** 连接状态 */
  public connectionState: Ref<ConnectionState> = ref('disconnected');
  
  /** 最后活动时间 */
  public lastActivity: Ref<Date> = ref(new Date());
  
  /** 错误信息 */
  public error: Ref<string> = ref('');
  
  /** 网络延迟 */
  public latency: Ref<number> = ref(0);

  constructor(config: Partial<WebSocketConfig> = {}) {
    this.config = {
      url: 'ws://localhost:3000/connection/ws',
      heartbeatInterval: 1000,
      reconnectDelay: 1000,
      maxReconnectAttempts: 5,
      timeout: 90000,
      aliveTimeout: 90000,
      messageQueueTimeout: 1000,
      ackTimeout: 5000,
      ...config
    };
  }

  // ========== 公共API方法 ==========

  /**
   * 建立WebSocket连接
   */
  //异步函数，因为结果需要等待事件的监听，让事件监听函数返回一个promise来结束connect函数
  async connect(token: string, senderId: string): Promise<void> {
    // 保存用户信息
    this.token = token;
    this.senderId = senderId;
    
    // 清理旧连接
    this.cleanup();

    // 构建带认证参数的URL
    //encodeURIComponent 将字符串转为安全的url编码，防止恶意注入
    const authUrl = `${this.config.url}?token=${encodeURIComponent(token)}`;

    this.ws = new WebSocket(authUrl);
    this.connectionState.value = 'connecting';

    const currentWs = this.ws;

    // 使用一个 Promise 来处理整个连接流程，确保连接成功或失败后才继续
    try {
      const connectionPromise = new Promise<void>((resolve, reject) => {
        // 检查连接是否已打开（如果非常快）
        if (currentWs.readyState === WebSocket.OPEN) {
          this.cleanupTimers();
          return resolve();
        }

        // 设置连接超时
        this.connectionTimer = setTimeout(() => {
          currentWs.close();
          reject(new Error('WS建立连接超时'));
        }, this.config.timeout) as unknown as number;

        // 注册一次性事件监听器来处理连接结果
        currentWs.onopen = () => {
          this.cleanupTimers();
          this.connectionTimer = undefined;
          resolve();
        };
        
        currentWs.onerror = (error) => {
          this.cleanupTimers();
          this.connectionTimer = undefined;
          reject(error);
        };
        
        currentWs.onclose = (event) => {
          this.cleanupTimers();
          this.connectionTimer = undefined;
          reject(new Error(`WebSocket connection failed during setup: ${event.code} - ${event.reason}`));
        };
      });

      // 等待 Promise 完成
      await connectionPromise;

      //取消一次性事情
      currentWs.onopen = null;
      currentWs.onerror = null;
      currentWs.onclose = null;

      // 如果连接成功，执行后续逻辑
      this.handleOpen();//onopen已经用于判断连接是否成功，这里需要手动调用从而初始化。
      this.registerEvents();
    } catch (error) {
      this.cleanup();
      throw error;
    }
  }

  /**
   * 断开WebSocket连接
   */
  disconnect(reconnectFlag: Boolean, reason:string): void {
    if(reconnectFlag){
      this.isManualDisconnect = true;
    }else{
      //立即重发消息队列，清空队列
      this.flushMessageQueue();
      this.messageQueue = [];
    }


    this.connectionState.value = 'disconnected';
    // 清理所有计时器
    this.cleanupTimers();

    const disconnectedMessage = JSON.stringify({
      type: 'disconnect',
      data: { reason }
    });
    
    // 发送断开通知
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try{
        this.ws.send(disconnectedMessage);
      }
      catch(error){
        console.error("WS关闭通知发送失败");
      }
    }
    
    // 关闭连接
    if (this.ws) {
      this.ws.close(1000, `Disconnect: ${reason}`);//可以添加事件监听器追踪close事件
    }

    //重置重连次数
    this.reconnectAttempts = 0;
    
    console.log(`WebSocket disconnected: ${reason}`);
  }

  /**
   * 快速断开连接（用于页面关闭等紧急情况）
   */
  quickDisconnect(): void {
    this.isManualDisconnect = true;
    this.cleanupTimers();
    
    if (this.ws) {
      this.ws.close(1000, 'Quick disconnect');
      this.ws = undefined;
    }
  }

  /**
   * 发送消息
   */
  send(message: LocalMessage): void {

    if (this.isConnected) {
      // 连接正常，直接发送
      this.ws?.send(JSON.stringify(message));
      //群聊/私聊/通知入列，等待ACK确认
      switch(message.type){
        case 'Group':
        case 'Private':
        case 'Notification':
          message.sendStatus = MessageStatus.SENDING;
          this.messageQueue.push(message);
          break;
        default: break;
      }
      console.log(`WS发送消息: ${message.type} ${message.payload}`);
    } else {
      // 连接断开，加入消息队列
      //不需要检测type，重发的时候发现是pending，直接重发并出列
      message.sendStatus = MessageStatus.PENDING;
      this.messageQueue.push(message);
      console.log('WS未连接, 消息已加入缓冲队列');
    }
  }

  // ========== 状态查询方法 ==========

  /**
   * 检查是否已连接
   */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && 
           this.connectionState.value === 'connected';
  }


  // ========== 事件注册方法 ==========

  /**
   * 注册事件处理器
   */
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)?.push(handler);
  }

  /**
   * 移除事件处理器
   */
  off(event: string, handler?: Function): void {
    if (!handler) {
      this.eventHandlers.delete(event);
    } else {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    }
  }

  // ========== 私有方法 ==========
  /**
   * 注册WebSocket事件处理器——每次连接都需要的持久事件
   */
  private registerEvents(): void {
      if (this.ws){
        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onclose = (event) => {
          this.handleClose(event);
        };

        this.ws.onerror = (error) => {
          this.handleError('WS连接出错');
        };

      }else {
        console.error('尝试为空的ws注册事件');
      }
  }

  //统一移除事件监听器
  private removeEvents(): void {
    const currentWs = this.ws;
    if (currentWs){
      currentWs.onmessage = null;
      currentWs.onmessage = null;
      currentWs.onclose = null;
      currentWs.onerror = null;
    }
  }

  private handleOpen(): void {
    console.log('WS连接建立成功');
    this.connectionState.value = 'connected';
    this.lastActivity.value = new Date();
    this.reconnectAttempts = 0;
    this.cleanupTimers();
    
    // 开始心跳机制
    try{
      this.startHeartbeat();
    }catch(error){
      console.error("WS心跳启动失败");
    }
    
    // 发送积压的消息
    this.flushMessageQueue();

    
    //开始轮询缓冲队列
    this.checkMessageQueue();
    
    // 触发连接成功事件
    // this.dispatchEvent('connected');
  }

  /**
   * 处理连接关闭事件
   */
  private handleClose(event: CloseEvent): void {
    console.log(`WS连接关闭: ${event.code}--${event.reason}`);
    this.connectionState.value = 'disconnected';
    this.stopHeartbeat();
    
    // // 关闭组件自定义事件
    // this.dispatchEvent('disconnected', {
    //   code: event.code,
    //   reason: event.reason
    // });

    this.cleanupTimers();

    this.removeEvents();

    this.ws = undefined;

    // 判断是否需要重连
    if (!this.isManualDisconnect && 
        event.code !== 1000 && // 正常关闭
        this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnect();
    } else {
      this.cleanup();
    }
  }

  /**
   * 处理错误事件
   */
  private handleError(errorMsg: string): void {
    console.error('WebSocket error:', errorMsg);
    this.error.value = errorMsg;
    this.dispatchEvent('error', errorMsg);
  }

  /**
   * 开始心跳机制
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    if (!this.senderId) {
      console.error('未获取到userId，无法发送心跳');
      throw new Error('未获取到userId，无法发送心跳');
    }
    const messagePing: MessagePing = new MessagePing(this.senderId);
    
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.isConnected && this.ws?.readyState===WebSocket.OPEN) {
        this.ws.send(JSON.stringify(messagePing));
        // console.log('WS发送心跳');
      }
    }, this.config.heartbeatInterval) as unknown as number;
  }

  /**
   * 停止心跳机制
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  /**
   * 处理接收到的消息 
   * 先处理心跳，再调用 messageHandler 处理其他消息
   */
  private handleMessage(rawData: string): void {
    try {
      const message: Message = JSON.parse(rawData);
      
      // 更新最后活动时间
      this.lastActivity.value = new Date();

      // 处理心跳
      //当前实现存在问题：收到的pong可能是很久之前的，延迟不准，心跳有可能已经超时，需要通过时间戳来确定
      switch (message.type) {
        case 'Pong': {
          // console.log(`WS收到心跳: ${message.payload.timestamp}`);
          if (this.aliveTimer) {
            clearTimeout(this.aliveTimer);
            this.aliveTimer = undefined;
          }
          this.aliveTimer = setTimeout(() => {
            console.warn('WS心跳超时,断开连接');
            this.disconnect(true, 'heartbeat_timeout');
          }, this.config.aliveTimeout) as unknown as number;
          break;
        }
        case 'Ping': {
          try {
            if(this.senderId){
              const messagePong: Message = new MessagePong(this.senderId);
              if(this.ws && this.ws.readyState === WebSocket.OPEN){
                this.ws.send(JSON.stringify(messagePong));
              }
            }
          } catch (error) {
            console.error("WS发送pong失败");
          }
          break;
        }
        case 'Ack': // Ack消息确认
          const tempId=message.payload.messageId;
          const realId=message.payload.detail;
          if(tempId && realId){
            this.messageQueue.forEach(m=>{
              if(m.payload.messageId===tempId){
                m.payload.messageId=realId;
                m.sendStatus = MessageStatus.SENT;
              }
            });
          }
          break;
        case 'Notification':
          // 处理好友相关通知
          if (message.payload.contentType === 'friend') {
            this.handleFriendNotification(message);
          } else {
            // 其他类型的通知消息
            messageService.updateMessage(message);
          }
          break;
          // todo private group消息在这里扩展websocket
        default:
          // 处理其他未明确的消息类型
          if (!Object.values(MessageType).includes(message.type as MessageType)) {
            // 直接调用消息处理器
            messageService.updateMessage(message);
          }
          break;
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
      this.handleError('Message parsing failed');
    }
  }

  /**
   * 处理好友相关的通知消息
   */
  private handleFriendNotification(message: Message): void {
    try {
      const friendStore = useFriendStore();

      if (!message.payload.detail) {
        console.warn('Friend notification missing detail');
        return;
      }

      const notificationDetail: FriendNotificationDetail = JSON.parse(message.payload.detail);

      console.log('Processing friend notification:', notificationDetail);

      switch (notificationDetail.action) {
        case 'friend_request':
          // 收到好友请求
          if (notificationDetail.sender_uid && notificationDetail.req_id) {
            const friendRequest = {
              req_id: notificationDetail.req_id,
              sender_uid: notificationDetail.sender_uid,
              receiver_uid: notificationDetail.receiver_uid || this.senderId || '',
              status: 'pending' as const,
              apply_text: notificationDetail.apply_text,
              create_time: new Date().toISOString(),
              sender_info: notificationDetail.user_info
            };

            friendStore.addPendingRequest(friendRequest);
            console.log('Friend request added to pending:', friendRequest);
          }
          break;

        case 'friend_response':
          // 好友请求响应
          if (notificationDetail.req_id && notificationDetail.status) {
            friendStore.updateRequestStatus(
              notificationDetail.req_id,
              notificationDetail.status,
              new Date().toISOString()
            );

            // 如果接受了请求，可能需要更新好友列表
            if (notificationDetail.status === 'accepted') {
              // TODO: 可以在这里触发好友列表刷新
              console.log('Friend request accepted:', notificationDetail.req_id);
            }
          }
          break;

        case 'friend_added':
          // 好友添加成功
          console.log('Friend added successfully');
          // TODO: 刷新好友列表
          break;

        case 'friend_removed':
          // 好友被删除
          console.log('Friend removed');
          // TODO: 更新好友状态
          break;

        default:
          console.warn('Unknown friend notification action:', notificationDetail.action);
          break;
      }

      // 将消息加入通知消息队列
      messageService.updateMessage(message);

    } catch (error) {
      console.error('Failed to process friend notification:', error);
    }
  }

  /**
   * 分发事件到处理器
   */
  private dispatchEvent(event: string, data?: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    
    const delay = this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;
    
    console.log(`WS计划重启 (第 ${this.reconnectAttempts} 次) 尝试重连时间：${delay}ms`);
    
    this.connectionState.value = 'reconnecting';
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      if (this.token && this.senderId) {
        this.connect(this.token, this.senderId).catch(error => {
          console.error('重连失败:', error);
        });
      }
    }, delay) as unknown as number;
  }

  /**
   * 发送积压的消息队列
   */
  private flushMessageQueue(): void {
    if (!this.isConnected || this.messageQueue.length === 0) return;
    
    console.log(`正在发送 ${this.messageQueue.length} 条队列消息`);
    
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  //轮询检测消息队列
  private checkMessageQueue():void {
    this.messageQueueTimer = setInterval(()=>{
      this.messageQueue.forEach(message=>{
        if(message.sendStatus==='pending'){
          this.send(message);
        }else if(message.sendStatus==='sending'){
          const timestamp = message.payload.timestamp;
          if(!timestamp){
            console.warn('消息缓冲队列出现缺少时间戳的消息');
          }else{
            if(Date.now()-timestamp!>this.config.ackTimeout){
              //发送超时
              message.sendStatus = MessageStatus.FAILED;
            }else{
              this.send(message);
            }
          }
        }
      })
      //pending和failed的消息重发后马上出列
      this.messageQueue = this.messageQueue.filter(
        message => message.sendStatus !== 'pending' && message.sendStatus !== 'failed'
      )
    },this.config.messageQueueTimeout);
  }

  /**
   * 清理所有计时器
   */
  private cleanupTimers(): void {
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = undefined;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    if (this.aliveTimer) {
      clearTimeout(this.aliveTimer);
      this.aliveTimer = undefined;
    }

    if(this.messageQueueTimer){
      clearTimeout(this.messageQueueTimer);
      this.messageQueueTimer = undefined;
    }
    
    this.stopHeartbeat();
  }

  /**
   * 完全清理资源
   */
  private cleanup(): void {
    this.cleanupTimers();
    this.isManualDisconnect = false;
    this.reconnectAttempts = 0;
    this.messageQueue = [];
    this.removeEvents();
    this.ws = undefined;
  }
}

// 创建单例实例
export const websocketService = new WebSocketService();

export default WebSocketService;
