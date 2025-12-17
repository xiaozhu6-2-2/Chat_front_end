/**
 * 模拟数据服务
 * 用于开发环境提供测试数据，避免依赖真实后端API
 */

import type { ContentType, FriendRequest, FriendWithUserInfo, type LocalMessage, MessageStatus, MessageText, MessageType, UserSearchResult } from './messageTypes'
import { reactive } from 'vue'
import { devLog } from '@/utils/env'

/**
 * 模拟消息数据生成器
 */
class MockDataService {
  // 模拟消息存储 - 按聊天ID分组
  private mockMessages = reactive(new Map<string, LocalMessage[]>())

  // 模拟用户列表
  private mockUsers = [
    { id: 'user-001', name: '张三', avatar: '/src/assets/user1.jpg' },
    { id: 'user-002', name: '李四', avatar: '/src/assets/user2.jpg' },
    { id: 'user-003', name: '王五', avatar: '/src/assets/user3.jpg' },
    { id: 'test-user-001', name: '测试用户', avatar: '/src/assets/yxd.jpg' },
  ]

  // 模拟聊天列表
  private mockChats = [
    {
      id: 'group-001',
      name: '309宿舍群',
      type: 'Group',
      avatar: '/src/assets/group1.jpg',
      lastMessage: '大家好！',
      unreadCount: 3,
    },
    {
      id: 'private-001',
      name: '张三-同事',
      type: 'Private',
      avatar: 'https://cdn.vuetifyjs.com/images/john.jpg',
      lastMessage: '明天见！',
      unreadCount: 0,
    },
    {
      id: 'private-002',
      name: '李四',
      type: 'Private',
      avatar: 'https://cdn.vuetifyjs.com/images/lists/1.jpg',
      lastMessage: '收到，谢谢！',
      unreadCount: 1,
    },
    {
      id: 'private-003',
      name: '王五-家人',
      type: 'Private',
      avatar: 'https://cdn.vuetifyjs.com/images/lists/2.jpg',
      lastMessage: '周末有空吗？',
      unreadCount: 0,
    },
    {
      id: 'private-004',
      name: '周八',
      type: 'Private',
      avatar: 'https://cdn.vuetifyjs.com/images/lists/5.jpg',
      lastMessage: '（已拉黑）',
      unreadCount: 0,
    },
  ]

  constructor () {
    this.initializeMockData()
    devLog('MockDataService initialized')
  }

  /**
   * 初始化模拟数据
   */
  private initializeMockData (): void {
    // 为群聊生成测试消息
    this.generateMockMessages('group-001', MessageType.GROUP, 15)

    // 为私聊生成测试消息
    this.generateMockMessages('private-001', MessageType.PRIVATE, 8)
  }

  /**
   * 生成模拟消息
   * @param chatId 聊天ID
   * @param messageType 消息类型
   * @param count 消息数量
   */
  private generateMockMessages (chatId: string, messageType: MessageType.GROUP | MessageType.PRIVATE, count: number): void {
    const messages: LocalMessage[] = []
    const now = Date.now()

    for (let i = 0; i < count; i++) {
      const timestamp = now - (count - i) * 60_000 // 每条消息间隔1分钟
      const senderIndex = i % this.mockUsers.length

      const mockMessage = new MessageText(messageType, {
        senderId: this.mockUsers[senderIndex]?.id || 'user-001',
        receiverId: chatId,
        contentType: ContentType.TEXT,
        detail: this.getRandomMessageText(i),
      })

      // 设置时间戳
      if (mockMessage.payload) {
        mockMessage.payload.timestamp = timestamp
      }

      // 随机设置消息状态
      const statusOptions: MessageStatus[] = [
        MessageStatus.SENT,
        MessageStatus.DELIVERED,
        MessageStatus.READ,
      ]
      mockMessage.sendStatus = statusOptions[Math.floor(Math.random() * statusOptions.length)]

      // 标记发送者
      mockMessage.userIsSender = mockMessage.payload.senderId === 'test-user-001'

      messages.push(mockMessage)
    }

    this.mockMessages.set(chatId, messages)
    devLog(`Generated ${count} mock messages for ${chatId}`)
  }

  /**
   * 获取随机消息文本
   * @param index 消息索引
   * @returns 随机消息文本
   */
  private getRandomMessageText (index: number): string {
    const messageTemplates = [
      '你好！最近怎么样？',
      '明天一起吃饭吧！',
      '项目进展如何？',
      '收到，我马上处理',
      '这个想法不错！',
      '我们一起讨论一下',
      '文件已发送，请查收',
      '会议改到下午3点',
      '周末有空吗？',
      '任务完成了！',
      '需要帮助吗？',
      '谢谢你的分享！',
      '我觉得这个方案可行',
      '让我想想...',
      '同意你的观点',
    ]

    return messageTemplates[index % messageTemplates.length] || '默认消息'
  }

  /**
   * 获取模拟消息列表
   * @param chatId 聊天ID
   * @returns 消息列表
   */
  public getMockMessages (chatId: string): LocalMessage[] {
    const messages = this.mockMessages.get(chatId)

    if (!messages) {
      devLog(`No mock messages found for chatId: ${chatId}, creating new ones...`)
      // 如果没有找到消息，动态创建
      const messageType = chatId.includes('group') ? MessageType.GROUP : MessageType.PRIVATE
      this.generateMockMessages(chatId, messageType, 5)
      return this.mockMessages.get(chatId) || []
    }

    return messages
  }

  /**
   * 添加新消息到模拟数据
   * @param chatId 聊天ID
   * @param message 新消息
   */
  public addMockMessage (chatId: string, message: LocalMessage): void {
    if (!this.mockMessages.has(chatId)) {
      this.mockMessages.set(chatId, [])
    }

    const messages = this.mockMessages.get(chatId)!

    // 检查是否已存在相同消息
    if (!messages.some(m => m.payload.messageId === message.payload.messageId)) {
      messages.push(message)
      devLog(`Added mock message to ${chatId}`)
    }
  }

  /**
   * 获取模拟用户信息
   * @param userId 用户ID
   * @returns 用户信息
   */
  public getMockUser (userId: string) {
    return this.mockUsers.find(user => user.id === userId)
  }

  /**
   * 获取模拟聊天列表
   * @returns 聊天列表
   */
  public getMockChats () {
    return this.mockChats
  }

  /**
   * 模拟发送消息的延迟效果
   * @param callback 回调函数
   * @param delay 延迟时间（毫秒）
   */
  public simulateSendDelay (callback: () => void, delay = 1000): void {
    setTimeout(() => {
      callback()
      devLog(`Mock message sent after ${delay}ms`)
    }, delay)
  }

  /**
   * 模拟网络错误（用于测试错误处理）
   * @param errorRate 错误率（0-1）
   * @returns 是否触发错误
   */
  public shouldSimulateError (errorRate = 0.1): boolean {
    return Math.random() < errorRate
  }

  // ============ 好友相关的 Mock 数据方法 ============

  /**
   * 模拟用户搜索
   * @param query 搜索关键词
   * @returns 搜索结果
   */
  public async mockSearchUsers (query: string): Promise<UserSearchResult[]> {
    // 模拟搜索延迟
    await new Promise(resolve => setTimeout(resolve, 500))

    const mockUsers: UserSearchResult[] = [
      {
        uid: 'user001',
        username: '张三',
        account: 'zhangsan',
        gender: 'male' as const,
        region: '北京',
        email: 'zhangsan@example.com',
        create_time: '2024-01-01T00:00:00Z',
        avatar: 'https://cdn.vuetifyjs.com/images/john.jpg',
        bio: '这是张三的个人简介',
        is_friend: false,
        request_sent: false,
        request_received: false,
      },
      {
        uid: 'user002',
        username: '李四',
        account: 'lisi',
        gender: 'female' as const,
        region: '上海',
        email: 'lisi@example.com',
        create_time: '2024-01-02T00:00:00Z',
        avatar: 'https://cdn.vuetifyjs.com/images/lists/1.jpg',
        bio: '这是李四的个人简介',
        is_friend: false,
        request_sent: false,
        request_received: false,
      },
      {
        uid: 'user003',
        username: '王五',
        account: 'wangwu',
        gender: 'male' as const,
        region: '深圳',
        email: 'wangwu@example.com',
        create_time: '2024-01-03T00:00:00Z',
        avatar: 'https://cdn.vuetifyjs.com/images/lists/2.jpg',
        bio: '这是王五的个人简介',
        is_friend: false,
        request_sent: false,
        request_received: false,
      },
      {
        uid: 'user004',
        username: '赵六',
        account: 'zhaoliu',
        gender: 'female' as const,
        region: '广州',
        email: 'zhaoliu@example.com',
        create_time: '2024-01-04T00:00:00Z',
        avatar: 'https://cdn.vuetifyjs.com/images/lists/3.jpg',
        bio: '这是赵六的个人简介',
        is_friend: false,
        request_sent: false,
        request_received: false,
      },
      {
        uid: 'user005',
        username: '孙七',
        account: 'sunqi',
        gender: 'other' as const,
        region: '杭州',
        email: 'sunqi@example.com',
        create_time: '2024-01-05T00:00:00Z',
        avatar: 'https://cdn.vuetifyjs.com/images/lists/4.jpg',
        bio: '这是孙七的个人简介',
        is_friend: false,
        request_sent: false,
        request_received: false,
      },
    ].filter(user =>
      user.username.includes(query)
      || user.account.includes(query)
      || user.email?.includes(query),
    )

    devLog(`Mock search users for query: ${query}, found ${mockUsers.length} results`)
    return mockUsers
  }

  /**
   * 模拟发送好友请求
   * @param receiver_uid 接收者用户ID
   * @param apply_text 申请文本
   * @param tags 标签数组
   * @returns 好友请求数据
   */
  public async mockSendFriendRequest (receiver_uid: string, apply_text?: string, tags?: string[]): Promise<FriendRequest> {
    await new Promise(resolve => setTimeout(resolve, 300))

    const request: FriendRequest = {
      req_id: `req_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      sender_uid: 'test-user-001', // TODO: 替换为当前用户ID
      receiver_uid,
      status: 'pending',
      apply_text,
      create_time: new Date().toISOString(),
    }

    // 如果有标签，在控制台输出用于调试
    if (tags && tags.length > 0) {
      devLog('Mock send friend request with tags', { req_id: request.req_id, receiver_uid, tags })
      // TODO: 在真实的实现中，这里应该将标签保存到创建的好友关系中
      // 可以在好友请求被接受后，为创建的好友关系设置这些标签
    } else {
      devLog('Mock send friend request', { req_id: request.req_id, receiver_uid })
    }

    return request
  }

  /**
   * 模拟响应好友请求
   * @param req_id 请求ID
   * @param status 响应状态
   */
  public async mockRespondToRequest (req_id: string, status: 'accepted' | 'rejected'): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300))
    devLog('Mock respond to friend request', { req_id, status })
  }

  /**
   * 模拟创建好友关系
   * @param uid 好友用户ID
   * @returns 好友信息
   */
  public async mockCreateFriend (uid: string): Promise<FriendWithUserInfo> {
    await new Promise(resolve => setTimeout(resolve, 200))

    const mockUsers = [
      {
        uid: 'user001',
        username: '张三',
        account: 'zhangsan',
        gender: 'male' as const,
        region: '北京',
        email: 'zhangsan@example.com',
        create_time: '2024-01-01T00:00:00Z',
        avatar: 'https://cdn.vuetifyjs.com/images/john.jpg',
        bio: '这是张三的个人简介',
      },
      {
        uid: 'user002',
        username: '李四',
        account: 'lisi',
        gender: 'female' as const,
        region: '上海',
        email: 'lisi@example.com',
        create_time: '2024-01-02T00:00:00Z',
        avatar: 'https://cdn.vuetifyjs.com/images/lists/1.jpg',
        bio: '这是李四的个人简介',
      },
      {
        uid: 'user003',
        username: '王五',
        account: 'wangwu',
        gender: 'male' as const,
        region: '深圳',
        email: 'wangwu@example.com',
        create_time: '2024-01-03T00:00:00Z',
        avatar: 'https://cdn.vuetifyjs.com/images/lists/2.jpg',
        bio: '这是王五的个人简介',
      },
      {
        uid: 'user004',
        username: '赵六',
        account: 'zhaoliu',
        gender: 'female' as const,
        region: '广州',
        email: 'zhaoliu@example.com',
        create_time: '2024-01-04T00:00:00Z',
        avatar: 'https://cdn.vuetifyjs.com/images/lists/3.jpg',
        bio: '这是赵六的个人简介',
      },
      {
        uid: 'user005',
        username: '孙七',
        account: 'sunqi',
        gender: 'other' as const,
        region: '杭州',
        email: 'sunqi@example.com',
        create_time: '2024-01-05T00:00:00Z',
        avatar: 'https://cdn.vuetifyjs.com/images/lists/4.jpg',
        bio: '这是孙七的个人简介',
      },
    ]

    const userInfo = mockUsers.find(user => user.uid === uid)
    if (!userInfo) {
      throw new Error(`User not found: ${uid}`)
    }

    const friend: FriendWithUserInfo = {
      fid: `friend_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      uid,
      to_uid: 'test-user-001', // TODO: 替换为当前用户ID
      create_time: new Date().toISOString(),
      is_blacklist: false,
      user_info: userInfo,
    }

    devLog('Mock create friend', { fid: friend.fid, uid })
    return friend
  }

  /**
   * 模拟获取好友列表
   * @returns 好友列表
   */
  public async mockGetFriends (): Promise<FriendWithUserInfo[]> {
    await new Promise(resolve => setTimeout(resolve, 400))

    const friends: FriendWithUserInfo[] = [
      {
        fid: 'friend001',
        uid: 'user001',
        to_uid: 'test-user-001',
        create_time: '2024-01-10T00:00:00Z',
        is_blacklist: false,
        remark: '我的好朋友',
        tag: '同事',
        user_info: {
          uid: 'user001',
          username: '张三',
          account: 'zhangsan',
          gender: 'male' as const,
          region: '北京',
          email: 'zhangsan@example.com',
          create_time: '2024-01-01T00:00:00Z',
          avatar: 'https://cdn.vuetifyjs.com/images/john.jpg',
          bio: '这是张三的个人简介',
        },
      },
      {
        fid: 'friend002',
        uid: 'user002',
        to_uid: 'test-user-001',
        create_time: '2024-01-12T00:00:00Z',
        is_blacklist: false,
        remark: '大学同学',
        tag: '同学',
        user_info: {
          uid: 'user002',
          username: '李四',
          account: 'lisi',
          gender: 'female' as const,
          region: '上海',
          email: 'lisi@example.com',
          create_time: '2024-01-02T00:00:00Z',
          avatar: 'https://cdn.vuetifyjs.com/images/lists/1.jpg',
          bio: '这是李四的个人简介',
        },
      },
      {
        fid: 'friend003',
        uid: 'user003',
        to_uid: 'test-user-001',
        create_time: '2024-01-15T00:00:00Z',
        is_blacklist: false,
        remark: '表哥',
        tag: '家人',
        user_info: {
          uid: 'user003',
          username: '王五',
          account: 'wangwu',
          gender: 'male' as const,
          region: '广州',
          email: 'wangwu@example.com',
          create_time: '2024-01-03T00:00:00Z',
          avatar: 'https://cdn.vuetifyjs.com/images/lists/2.jpg',
          bio: '这是王五的个人简介',
        },
      },
      {
        fid: 'friend004',
        uid: 'user004',
        to_uid: 'test-user-001',
        create_time: '2024-01-20T00:00:00Z',
        is_blacklist: false,
        tag: '朋友',
        user_info: {
          uid: 'user004',
          username: '赵六',
          account: 'zhaoliu',
          gender: 'male' as const,
          region: '深圳',
          email: 'zhaoliu@example.com',
          create_time: '2024-01-04T00:00:00Z',
          avatar: 'https://cdn.vuetifyjs.com/images/lists/3.jpg',
          bio: '这是赵六的个人简介',
        },
      },
      {
        fid: 'friend005',
        uid: 'user005',
        to_uid: 'test-user-001',
        create_time: '2024-01-25T00:00:00Z',
        is_blacklist: false,
        tag: '同事',
        user_info: {
          uid: 'user005',
          username: '钱七',
          account: 'qianqi',
          gender: 'female' as const,
          region: '杭州',
          email: 'qianqi@example.com',
          create_time: '2024-01-05T00:00:00Z',
          avatar: 'https://cdn.vuetifyjs.com/images/lists/4.jpg',
          bio: '这是钱七的个人简介',
        },
      },
      // 添加一个黑名单好友用于测试
      {
        fid: 'friend006',
        uid: 'user006',
        to_uid: 'test-user-001',
        create_time: '2024-01-05T00:00:00Z',
        is_blacklist: true,
        remark: '被拉黑的用户',
        tag: '已拉黑',
        user_info: {
          uid: 'user006',
          username: '周八',
          account: 'zhouba',
          gender: 'male' as const,
          region: '成都',
          email: 'zhouba@example.com',
          create_time: '2024-01-06T00:00:00Z',
          avatar: 'https://cdn.vuetifyjs.com/images/lists/5.jpg',
          bio: '这是一个被拉黑的用户',
        },
      },
    ]

    devLog('Mock get friends', { count: friends.length })
    return friends
  }

  /**
   * 模拟更新好友标签
   * @param friendId 好友ID
   * @param tag 新标签
   */
  public async mockUpdateFriendTag (friendId: string, tag: string | null): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200))
    devLog('Mock update friend tag', { friendId, tag })
    // 这里只是模拟，实际应用中会调用真实API
  }

  /**
   * 模拟获取待处理的好友请求
   * @returns 请求列表
   */
  public async mockGetPendingRequests (): Promise<{
    receivedRequests: FriendRequest[]
    sentRequests: FriendRequest[]
  }> {
    await new Promise(resolve => setTimeout(resolve, 300))

    const receivedRequests: FriendRequest[] = [
      {
        req_id: 'req_received_001',
        sender_uid: 'user003',
        receiver_uid: 'test-user-001',
        status: 'pending',
        apply_text: '你好，我是王五，想添加你为好友',
        create_time: '2024-01-15T10:00:00Z',
        sender_info: {
          uid: 'user003',
          username: '王五',
          account: 'wangwu',
          gender: 'male' as const,
          region: '深圳',
          email: 'wangwu@example.com',
          create_time: '2024-01-03T00:00:00Z',
          avatar: 'https://cdn.vuetifyjs.com/images/lists/2.jpg',
          bio: '这是王五的个人简介',
        },
      },
      {
        req_id: 'req_received_002',
        sender_uid: 'user004',
        receiver_uid: 'test-user-001',
        status: 'pending',
        apply_text: '你好，通过朋友推荐想认识你',
        create_time: '2024-01-16T14:30:00Z',
        sender_info: {
          uid: 'user004',
          username: '赵六',
          account: 'zhaoliu',
          gender: 'female' as const,
          region: '广州',
          email: 'zhaoliu@example.com',
          create_time: '2024-01-04T00:00:00Z',
          avatar: 'https://cdn.vuetifyjs.com/images/lists/3.jpg',
          bio: '这是赵六的个人简介',
        },
      },
    ]

    const sentRequests: FriendRequest[] = [
      {
        req_id: 'req_sent_001',
        sender_uid: 'test-user-001',
        receiver_uid: 'user005',
        status: 'pending',
        apply_text: '你好，想和你交个朋友',
        create_time: '2024-01-14T15:30:00Z',
      },
      {
        req_id: 'req_sent_002',
        sender_uid: 'test-user-001',
        receiver_uid: 'user006',
        status: 'accepted',
        apply_text: '请添加我为好友',
        create_time: '2024-01-13T09:15:00Z',
        handle_time: '2024-01-13T10:00:00Z',
      },
    ]

    devLog('Mock get pending requests', {
      received: receivedRequests.length,
      sent: sentRequests.length,
    })

    return { receivedRequests, sentRequests }
  }

  /**
   * 模拟删除好友
   * @param friendId 好友ID
   */
  public async mockRemoveFriend (friendId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300))
    devLog('Mock remove friend', { friendId })
  }

  /**
   * 模拟更新好友备注
   * @param friendId 好友ID
   * @param remark 备注内容
   */
  public async mockUpdateFriendRemark (friendId: string, remark: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200))
    devLog('Mock update friend remark', { friendId, remark })
  }

  /**
   * 模拟设置好友黑名单
   * @param friendId 好友ID
   * @param is_blacklist 是否黑名单
   */
  public async mockSetFriendBlacklist (friendId: string, is_blacklist: boolean): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200))
    devLog('Mock set friend blacklist', { friendId, is_blacklist })
  }

  /**
   * 获取当前用户信息（Mock）
   */
  public async mockGetCurrentUserInfo (): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 100))

    return {
      uid: 'test-user-001',
      username: 'Test User',
      account: 'test-user',
      gender: 'other' as const,
      region: 'Mock Region',
      email: 'test@example.com',
      create_time: '2024-01-01T00:00:00Z',
      avatar: 'https://via.placeholder.com/40',
      bio: 'Mock user for development',
    }
  }

  /**
   * 模拟接收好友通知（用于测试）
   */
  public async mockReceiveFriendNotification (senderId: string, notificationDetail: any): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500))

    // 动态导入messageService以避免循环依赖
    const { messageService } = await import('./message')

    // 模拟创建通知消息
    const notificationMessage = new MessageText(MessageType.NOTIFICATION, {
      senderId,
      receiverId: 'test-user-001',
      contentType: ContentType.FRIEND,
      detail: JSON.stringify(notificationDetail),
    })

    // 添加到消息队列，模拟接收
    messageService.updateMessage(notificationMessage)

    devLog('Mock friend notification received', notificationDetail)
  }
}

// 导出单例实例
export const mockDataService = new MockDataService()
