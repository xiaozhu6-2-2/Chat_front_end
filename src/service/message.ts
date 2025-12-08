//service/message.ts
/*
1、群聊私聊区分：chatType
2、消息ID生成：采用时间戳+随机数，首次获取历史消息时，按时间戳排列。
3、接收的/发送的新消息无脑入队尾
4、send封装需要ws实例
5、支持开发环境和生产环境切换：
   - 开发环境：使用mockDataService提供模拟数据
   - 生产环境：使用真实API和WebSocket
*/
import { reactive, computed } from 'vue';
import type {Ref} from 'vue';
import { websocketService } from './websocket';
import { authApi } from './api';
import { envConfig, devLog, isDevelopment } from '@/utils/env';
import { mockDataService } from './mockDataService';
import { friendService } from './friendService';
import type { Message, FriendNotificationDetail, UserProfile } from './messageTypes';
import { ContentType, LocalMessage, MessageStatus, MessageText, MessageType } from './messageTypes';
import type { UserSearchResult, FriendWithUserInfo, FriendRequest } from './messageTypes';

class MessageService {
  //消息map，group、private、Notification
  //每个群聊、私聊维护一个数组，按时间戳排列
  //初始化时，根据环境选择数据源：
  // - 开发环境：使用mockDataService
  // - 生产环境：从服务器API拉取
  groupMessages = reactive(new Map<string, LocalMessage[]>())
  privateMessages = reactive(new Map<string, LocalMessage[]>())
  notificationMessages = reactive(new Map<string, LocalMessage[]>())

  userId: string | undefined = undefined;
  token: string | undefined = undefined;
  isInitialized: boolean = false;
  //用于记录已加载历史消息的群聊
  loadedChats: Set<string> = new Set();

  constructor() {
    // 只有在开发环境且启用mock数据时才自动初始化
    if (isDevelopment() && envConfig.useMockData) {
      this.initDevelopmentMode()
    }
  }

  /**
   * 开发环境初始化
   */
  private initDevelopmentMode(): void {
    devLog('Initializing MessageService in development mode')

    // 使用环境配置中的模拟用户信息
    this.userId = envConfig.mockUserId
    this.token = envConfig.mockUserToken
    this.isInitialized = true

    // 预加载一些模拟数据
    this.loadMockData()
  }

  /**
   * 加载模拟数据
   */
  private loadMockData(): void {
    const mockChats = mockDataService.getMockChats()

    mockChats.forEach(chat => {
      if (chat.type === 'Group') {
        this.loadMockGroupMessages(chat.id)
      } else {
        this.loadMockPrivateMessages(chat.id)
      }
    })

    devLog('Mock data loaded successfully')
  }

  /**
   * 加载模拟群聊消息
   */
  private loadMockGroupMessages(chatId: string): void {
    const messages = mockDataService.getMockMessages(chatId)

    if (!this.groupMessages.has(chatId)) {
      this.groupMessages.set(chatId, reactive([]))
    }

    const messageArray = this.groupMessages.get(chatId)!
    messages.forEach(message => {
      if (!messageArray.some(m => m.payload.messageId === message.payload.messageId)) {
        messageArray.push(message)
      }
    })

    this.loadedChats.add(chatId)
  }

  /**
   * 加载模拟私聊消息
   */
  private loadMockPrivateMessages(chatId: string): void {
    const messages = mockDataService.getMockMessages(chatId)

    if (!this.privateMessages.has(chatId)) {
      this.privateMessages.set(chatId, reactive([]))
    }

    const messageArray = this.privateMessages.get(chatId)!
    messages.forEach(message => {
      if (!messageArray.some(m => m.payload.messageId === message.payload.messageId)) {
        messageArray.push(message)
      }
    })

    this.loadedChats.add(chatId)
  }

  /**
   * 判断是否使用模拟数据
   */
  private shouldUseMockData(): boolean {
    return isDevelopment() && envConfig.useMockData
  }

  async init(token: string, userId: string): Promise<void> {
    // 开发环境已经初始化过，直接返回
    if (this.shouldUseMockData() && this.isInitialized) {
      devLog('MessageService already initialized in development mode')
      return
    }

    this.token = token;
    this.userId = userId;

    // 初始化 friendService
    friendService.init(token, userId);

    // 生产环境或开发环境关闭模拟数据时，连接真实的WebSocket
    if (!this.shouldUseMockData()) {
      try {
        // 连接WebSocket服务
        devLog('Connecting to WebSocket server...');
        await websocketService.connect(token, userId);
        devLog('WebSocket connected successfully');

        // 获取历史通知消息
        await this.fetchHistoryNotificationMessages();
        this.notificationMessages.forEach(messages => {
          this.sortMessages(messages);
        });
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        throw new Error(`WebSocket连接失败: ${error}`);
      }
    }

    this.isInitialized = true;
    devLog('MessageService initialized successfully', {
      mode: this.shouldUseMockData() ? 'mock' : 'production',
      userId: this.userId
    });
  }

  //入列操作，判断消息类型，入队尾
  enqueueMessage(message: LocalMessage) {
    const reactiveMessage = reactive(message);
    switch (reactiveMessage.type) {
      case "Group": {
        let chatId = reactiveMessage.payload.chatId;
        if(!chatId){
          console.warn('群聊消息缺少receiverId');
          return;
        }
        if (!this.groupMessages.has(chatId)) {
          //创建的消息数组必须是reactive
          this.groupMessages.set(chatId, reactive([]))
        }
        //判断是否已存在相同的消息
        const arr = this.groupMessages.get(chatId)!;
        if (arr.some(m => m.payload.messageId === reactiveMessage.payload.messageId)) return;
        arr.push(reactiveMessage);
        break;
      }
      case "Private": {
        //私聊消息
        let chatId = reactiveMessage.payload.chatId;
        if(!chatId){
          console.warn('私聊消息缺少receiverId');
          return;
        }
        if (!this.privateMessages.has(chatId)) {
          this.privateMessages.set(chatId, reactive([]));
        }
        //判断是否已存在相同的消息
        const arr = this.privateMessages.get(chatId)!;
        if (arr.some(m => m.payload.messageId === reactiveMessage.payload.messageId)) return;
        arr.push(reactiveMessage);
        break;
      }
      case "Notification": {
        //通知消息，通过chatType区分
        let notificationId = reactiveMessage.payload.contentType;
        if(!notificationId){
          console.warn('通知消息缺少contentType');
          return;
        }
        if (!this.notificationMessages.has(notificationId)) {
          this.notificationMessages.set(notificationId, reactive([]));
        }
        //判断是否已存在相同的消息
        const arr = this.notificationMessages.get(notificationId)!;
        if (arr.some(m => m.payload.messageId === reactiveMessage.payload.messageId)) return;
        arr.push(reactiveMessage);
        break;
      }
      default: {
        console.warn(`非法消息类型：${reactiveMessage.type} 尝试入列`);
      }
    }
  }

  //排序操作，找到chatId和消息类型对应的消息数组，按时间戳排序
  sortMessages(messages: LocalMessage[]|undefined) {
    if (!messages) {
      return;
    }
    messages.sort((a, b) => a.payload.timestamp! - b.payload.timestamp!);
  }

  //拉取历史通知
  async fetchHistoryNotificationMessages():Promise<void> {
    if(!this.token){
      console.error('token为空, 无法拉取历史通知');
      return;
    }
    try{
      const response = await authApi.post('/history/notifications');
      if (response.status === 200) {
        const messages:Message[] = response.data.messages;
        messages.forEach(message => {
          const localMessage = LocalMessage.toLocalMessage(message);
          this.enqueueMessage(localMessage);
        });
      }else{
        console.error(`拉取历史通知失败：${response.status} ${response.data.message}`);
        alert(`拉取历史通知失败：${response.status} ${response.data.message}`);
      }
    }catch(error){
      console.error(`调用拉取历史通知接口失败：${error}`);
    }
  }

  //历史消息按需加载并排序，需要传入聊天号
  //根据环境选择数据源：
  // - 开发环境：使用mockDataService
  // - 生产环境：调用API
  async fetchHistoryPrivateMessages(chatId: string): Promise<void> {
    if(this.loadedChats.has(chatId)){
      return;
    }
    this.loadedChats.add(chatId);

    // 开发环境使用模拟数据
    if (this.shouldUseMockData()) {
      devLog(`Fetching mock private messages for ${chatId}`)
      this.loadMockPrivateMessages(chatId)
      return
    }

    // 生产环境调用API
    try{
      const response = await authApi.post('/history/private', { chatId });
      if (response.status === 200) {
        const messages:Message[] = response.data.messages;
        messages.forEach(message => {
          const localMessage = LocalMessage.toLocalMessage(message);
          this.enqueueMessage(localMessage);
        });
        if(this.privateMessages.has(chatId)){
          this.sortMessages(this.privateMessages.get(chatId));
        }
      }else{
        console.error(`拉取历史私聊失败：${response.status} ${response.data.message}`);
        alert(`拉取历史私聊失败：${response.status} ${response.data.message}`);
      }
    }catch(error){
      this.loadedChats.delete(chatId);
      console.error(`拉取历史私聊失败：${error}`);
      alert(`拉取历史私聊失败：${error}`);
    }
  }

  async fetchHistoryGroupMessages(chatId: string,): Promise<void> {
    //未拉取过的群聊不拉取历史消息
    if(this.loadedChats.has(chatId)){
      return;
    }
    this.loadedChats.add(chatId);

    // 开发环境使用模拟数据
    if (this.shouldUseMockData()) {
      devLog(`Fetching mock group messages for ${chatId}`)
      this.loadMockGroupMessages(chatId)
      return
    }

    // 生产环境调用API
    try{
      const response = await authApi.post('/history/group', { chatId });
      if (response.status === 200) {
        const messages:Message[] = response.data.messages;
        messages.forEach(message => {
          const localMessage = LocalMessage.toLocalMessage(message);
          this.enqueueMessage(localMessage);
        });
        if(this.groupMessages.has(chatId)){
          this.sortMessages(this.groupMessages.get(chatId));
        }
      }else{
        console.error(`拉取历史群聊失败：${response.status} ${response.data.message}`);
        alert(`拉取历史群聊失败：${response.status} ${response.data.message}`);
      }
    }catch(error){
      this.loadedChats.delete(chatId);
      console.error(`拉取历史群聊失败：${error}`);
      alert(`拉取历史群聊失败：${error}`);
    }
  }

  //ws的onmessage中调用，根据type决定接收的新消息是否入列
  updateMessage(message: Message) {
    const localMessage = LocalMessage.toLocalMessage(message);
    this.enqueueMessage(localMessage);
    switch (localMessage.type) {
      case "Group":
      case "Private":
      case "Notification": {
        if(localMessage.payload.senderId===this.userId){
          localMessage.userIsSender=true;
        }
        this.enqueueMessage(localMessage);
        break;
      }
      case "System": {
        //todo:系统消息，需要根据chatType分别维护状态列表
        break;
      }
      default: {
        console.warn(`未知消息类型：${localMessage.type} 尝试更新`);
      }
    }
  }

  //todo: 发送消息后端的ack确认机制以及id生成机制
  //这里的send是用于需要入列的消息，比如私聊、群聊、通知等
  //根据环境选择发送方式：
  // - 开发环境：模拟发送，添加到mock数据
  // - 生产环境：通过WebSocket发送
  sendWithUpdate(message: LocalMessage) {
    // 开发环境使用模拟发送
    if (this.shouldUseMockData()) {
      this.mockSendMessage(message)
      return
    }

    // 生产环境通过WebSocket发送
    //ws连接检测、消息发送队列都在wsService中维护
    try{
      websocketService.send(message);
      this.enqueueMessage(message);
      console.log(`发送消息：${message} 入列`)
    }catch(error){
      console.error(error);
      // 发送失败时标记消息状态
      message.sendStatus = MessageStatus.FAILED
    }
  }

  //不入列发送，用于ping/pong/system等消息
  sendWithoutUpdate(message: LocalMessage) {
    console.log(`发送消息：${message} 不入列`)

    // 开发环境模拟发送
    if (this.shouldUseMockData()) {
      devLog('Mock: Message sent without update')
      return
    }

    // 生产环境通过WebSocket发送
    websocketService.send(message);
  }

  /**
   * 模拟发送消息
   */
  private mockSendMessage(message: LocalMessage): void {
    // 设置发送中状态
    message.sendStatus = MessageStatus.SENDING  
    message.userIsSender = true

    // 立即将消息入队，显示为发送中状态
    this.enqueueMessage(message)
    // 模拟发送延迟
    mockDataService.simulateSendDelay(() => {
      // 模拟发送成功
      message.sendStatus = MessageStatus.SENT
      devLog('Mock message sent successfully', message)

      // 模拟接收到回复消息
      this.mockReceiveReply(message)

    }, 1000)

    devLog('Mock message sending initiated', message)
  }

  /**
   * 模拟接收回复消息
   */
  private mockReceiveReply(originalMessage: LocalMessage): void {
    if (Math.random() > 0.3) { // 70%概率收到回复
      const replyMessage = new MessageText(originalMessage.type, {
        senderId: 'user-002', // 模拟其他用户回复
        receiverId: originalMessage.payload.chatId,
        contentType: ContentType.TEXT,
        detail: `收到你的消息："${originalMessage.payload.detail}"`
      })

      replyMessage.userIsSender = false
      replyMessage.sendStatus = MessageStatus.SENT

      // 延迟一下再添加回复，模拟网络延迟
      setTimeout(() => {
        this.enqueueMessage(replyMessage)
        devLog('Mock reply message received', replyMessage)
      }, 500)
    }
  }

  //组件获取消息列表，返回computed是为了保证map.get(id)时，id变化时，messages也会响应式更新
  //reactive(map)并不能监测 .get(id) 的变化，所以需要用computed包裹
  getMessages(mapType: string, idRef: Ref<string>) {
    let map: Map<string, LocalMessage[]>;

    switch (mapType) {
      case 'Group':
        map = this.groupMessages;
        break;
      case 'Private':
        map = this.privateMessages;
        break;
      case 'Notification':
        map = this.notificationMessages;
        break;
      default:
        throw new Error(`Unknown mapType: ${mapType}`);
    }

    return computed(() => map.get(idRef.value) || []);
  }

  // ============ 好友相关的服务方法 ============

  /**
   * 搜索用户
   * @param query 搜索关键词
   * @returns 搜索结果
   */
  async searchUsers(query: string): Promise<UserSearchResult[]> {
    return await friendService.searchUsers(query);
  }

  /**
   * 发送好友请求
   * @param receiver_uid 接收者用户ID
   * @param apply_text 申请文本
   * @param tags 标签数组
   * @returns 好友请求数据
   */
  async sendFriendRequest(receiver_uid: string, apply_text?: string, tags?: string[]): Promise<FriendRequest> {
    try {
      // 1. 创建好友请求（数据层操作）
      const request = await friendService.createFriendRequest(receiver_uid, apply_text, tags);

      // 2. 创建好友请求通知消息并通过现有消息系统发送
      await this.sendFriendRequestMessage(receiver_uid, request, apply_text);

      return request;
    } catch (error) {
      console.error('发送好友请求失败:', error);
      throw error;
    }
  }

  /**
   * 响应好友请求
   * @param req_id 请求ID
   * @param status 响应状态
   */
  async respondToFriendRequest(req_id: string, status: 'accepted' | 'rejected'): Promise<void> {
    try {
      // 1. 调用数据层API处理响应（后端处理数据库操作）
      await friendService.respondToFriendRequest(req_id, status);

      // 2. 创建好友响应通知消息并通过现有消息系统发送
      await this.sendFriendResponseMessage(req_id, status);
    } catch (error) {
      console.error('响应好友请求失败:', error);
      throw error;
    }
  }

  /**
   * 获取好友列表
   * @returns 好友列表
   */
  async getFriends(): Promise<FriendWithUserInfo[]> {
    return await friendService.getFriends();
  }

  /**
   * 获取待处理的好友请求
   * @returns 请求列表
   */
  async getPendingRequests(): Promise<{
    receivedRequests: FriendRequest[]
    sentRequests: FriendRequest[]
  }> {
    return await friendService.getPendingRequests();
  }

  /**
   * 删除好友
   * @param friendId 好友ID
   */
  async removeFriend(friendId: string): Promise<void> {
    return await friendService.removeFriend(friendId);
  }

  /**
   * 更新好友备注
   * @param friendId 好友ID
   * @param remark 备注内容
   */
  async updateFriendRemark(friendId: string, remark: string): Promise<void> {
    return await friendService.updateFriendRemark(friendId, remark);
  }

  /**
   * 设置好友黑名单状态
   * @param friendId 好友ID
   * @param is_blacklist 是否黑名单
   */
  async setFriendBlacklist(friendId: string, is_blacklist: boolean): Promise<void> {
    return await friendService.setFriendBlacklist(friendId, is_blacklist);
  }

  // ============ WebSocket通知发送方法 ============

  /**
   * 发送好友请求的通知消息
   * @param receiver_uid 接收者用户ID
   * @param request 好友请求数据
   * @param apply_text 申请文本
   */
  private async sendFriendRequestMessage(
    receiver_uid: string,
    request: FriendRequest,
    apply_text?: string
  ): Promise<void> {
    try {
      // 获取当前用户信息
      const currentUserInfo = await this.getCurrentUserInfo();

      // 创建通知详情
      const notificationDetail: FriendNotificationDetail = {
        action: 'friend_request',
        req_id: request.req_id,
        sender_uid: this.userId!,
        receiver_uid: receiver_uid,
        apply_text: apply_text,
        user_info: currentUserInfo
      };

      // 创建通知消息
      const notificationMessage = new MessageText(MessageType.NOTIFICATION, {
        senderId: this.userId!,
        receiverId: receiver_uid,
        contentType: ContentType.FRIEND,
        detail: JSON.stringify(notificationDetail)
      });

      // 使用现有的sendWithUpdate方法发送消息，这样会通过WebSocket系统发送
      this.sendWithUpdate(notificationMessage);

      devLog('Friend request message sent', {
        req_id: request.req_id,
        receiver_uid
      });

    } catch (error) {
      console.error('Failed to send friend request message:', error);
    }
  }

  /**
   * 获取当前用户信息（开发环境Mock）
   */
  private async getCurrentUserInfo(): Promise<UserProfile> {
    if (this.shouldUseMockData()) {
      return await mockDataService.mockGetCurrentUserInfo();
    }

    // TODO: 生产环境从API获取用户信息
    throw new Error('生产环境用户信息获取API尚未实现');
  }

  /**
   * 发送好友请求响应的通知消息
   * @param req_id 请求ID
   * @param status 响应状态
   */
  private async sendFriendResponseMessage(
    req_id: string,
    status: 'accepted' | 'rejected'
  ): Promise<void> {
    try {
      // 获取请求详情以确定接收者
      const request = await this.getFriendRequestById(req_id);
      if (!request) {
        console.warn('Friend request not found for notification:', req_id);
        return;
      }

      // 获取当前用户信息
      const currentUserInfo = await this.getCurrentUserInfo();

      // 创建响应通知详情
      const notificationDetail: FriendNotificationDetail = {
        action: 'friend_response',
        req_id: req_id,
        sender_uid: this.userId!,
        receiver_uid: request.sender_uid,
        status: status,
        user_info: currentUserInfo
      };

      // 创建通知消息
      const notificationMessage = new MessageText(MessageType.NOTIFICATION, {
        senderId: this.userId!,
        receiverId: request.sender_uid,
        contentType: ContentType.FRIEND,
        detail: JSON.stringify(notificationDetail)
      });

      // 使用sendWithUpdate方法发送消息，这样会通过WebSocket系统发送
      this.sendWithUpdate(notificationMessage);

      devLog('Friend response message sent', {
        req_id,
        status,
        receiver_uid: request.sender_uid
      });

    } catch (error) {
      console.error('Failed to send friend response message:', error);
    }
  }

  /**
   * 获取好友请求详情（用于通知发送）
   * @param req_id 请求ID
   * @returns 好友请求数据或null
   */
  private async getFriendRequestById(req_id: string): Promise<FriendRequest | null> {
    try {
      // 开发环境从mock数据获取
      if (this.shouldUseMockData()) {
        const pendingRequests = await mockDataService.mockGetPendingRequests();
        const allRequests = [...pendingRequests.receivedRequests, ...pendingRequests.sentRequests];
        return allRequests.find(req => req.req_id === req_id) || null;
      }

      // TODO: 生产环境从API获取
      // const response = await authApi.get(`/auth/friend/request/${req_id}`);
      // return response.data.request;

      throw new Error('生产环境获取请求详情API尚未实现');
    } catch (error) {
      console.error('Failed to get friend request:', error);
      return null;
    }
  }

  }


export type { LocalMessage } from './messageTypes';
export { friendService } from './friendService';
export const messageService = new MessageService();