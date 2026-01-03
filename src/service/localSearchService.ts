/**
 * 本地搜索服务层
 *
 * 执行流程：
 * 1. 从各个 Store 中获取数据
 * 2. 根据搜索条件执行匹配算法
 * 3. 对结果进行排序和分页
 * 4. 返回标准化的搜索结果
 *
 * 数据流：
 * - 输入：LocalSearchParams 搜索参数
 * - 输出：LocalSearchResult 标准化结果
 * - 副作用：读取各个 Store 的数据
 *
 * 使用场景：
 * - Composable 层调用执行本地搜索
 * - 提供各类数据的搜索算法实现
 */

import type {
  ChatSearchResult,
  LocalSearchParams,
  LocalSearchResult,
  MessageSearchResult,
} from '@/types/localSearch'
import type {
  GroupSearchResult,
  UserSearchResult,
} from '@/types/search'
import { messageService } from '@/service/message'
import { useChatStore } from '@/stores/chatStore'
import { useFriendStore } from '@/stores/friendStore'
import { useGroupStore } from '@/stores/groupStore'
import { ContentType } from '@/types/message'
import { MessageType } from '@/types/websocket'

/**
 * 本地搜索服务对象
 *
 * 提供本地数据搜索的核心功能
 */
export const localSearchService = {
  /**
   * 执行本地搜索
   *
   * 执行流程：
   * 1. 根据搜索类型确定搜索范围
   * 2. 调用对应的搜索方法
   * 3. 聚合所有搜索结果
   * 4. 返回综合结果对象
   *
   * 数据流：
   * - 输入：搜索参数（关键词、类型、过滤条件等）
   * - 输出：各类型搜索结果的聚合
   *
   * 使用场景：
   * - 全局搜索（搜索所有类型）
   * - 特定类型搜索
   *
   * @param {LocalSearchParams} params - 搜索参数
   * @returns {Promise<LocalSearchResult>} 搜索结果
   */
  async searchLocal (params: LocalSearchParams): Promise<LocalSearchResult> {
    console.log('localSearchService: 开始执行本地搜索', params)

    const results: LocalSearchResult = {
      friends: [],
      groups: [],
      chats: [],
      messages: [],
    }

    try {
      // 根据搜索类型执行相应搜索
      switch (params.type) {
        case 'friend': {
          results.friends = await this.searchFriends(params)
          break
        }
        case 'group': {
          results.groups = await this.searchGroups(params)
          break
        }
        case 'chat': {
          results.chats = await this.searchChats(params)
          break
        }
        case 'message': {
          results.messages = await this.searchMessages(params)
          break
        }
        case 'all': {
          // 全局搜索，搜索所有类型
          const [friends, groups, chats, messages] = await Promise.all([
            this.searchFriends(params),
            this.searchGroups(params),
            this.searchChats(params),
            this.searchMessages(params),
          ])
          results.friends = friends
          results.groups = groups
          results.chats = chats
          results.messages = messages
          break
        }
        default: {
          console.warn('localSearchService: 未知的搜索类型', params.type)
        }
      }

      console.log(`localSearchService: 搜索完成，共找到 ${
        results.friends.length + results.groups.length
        + results.chats.length + results.messages.length
      } 个结果`)

      return results
    } catch (error) {
      console.error('localSearchService: 搜索过程中发生错误', error)
      throw error
    }
  },

  /**
   * 搜索好友
   *
   * 执行流程：
   * 1. 获取好友列表数据
   * 2. 应用过滤条件（黑名单、标签等）
   * 3. 在多个字段中匹配关键词
   * 4. 按相关性排序
   * 5. 应用分页
   *
   * 数据流：
   * - 输入：搜索参数
   * - 输出：好友搜索结果列表
   *
   * 使用场景：
   * - 好友列表搜索
   * - 查找特定好友
   *
   * @param {LocalSearchParams} params - 搜索参数
   * @returns {Promise<UserSearchResult[]>} 好友搜索结果
   */
  async searchFriends (params: LocalSearchParams): Promise<UserSearchResult[]> {
    console.log('localSearchService: 开始搜索好友')
    const friendStore = useFriendStore()
    const friends = Array.from(friendStore.friends.values())

    // 应用过滤器
    let filteredFriends = friends.filter(friend => {
      // 黑名单过滤
      if (!params.filters?.includeBlacklisted && friend.isBlacklisted) {
        return false
      }

      // 标签过滤
      if (params.filters?.tags?.length && (!friend.tag || !params.filters.tags.includes(friend.tag))) {
        return false
      }

      return true
    })

    // 执行搜索匹配
    const searchText = params.query.toLowerCase()
    const matches = filteredFriends.filter(friend => {
      return (
        friend.name?.toLowerCase().includes(searchText)
        || friend.remark?.toLowerCase().includes(searchText)
        || friend.bio?.toLowerCase().includes(searchText)
        || friend.tag?.toLowerCase().includes(searchText)
      )
    })

    // 计算相关性并排序
    matches.sort((a, b) => {
      const query = searchText
      const aRemarkMatch = a.remark?.toLowerCase().includes(query) ? 1 : 0
      const bRemarkMatch = b.remark?.toLowerCase().includes(query) ? 1 : 0
      const aNameMatch = a.name?.toLowerCase().includes(query) ? 1 : 0
      const bNameMatch = b.name?.toLowerCase().includes(query) ? 1 : 0

      // 优先级：备注 > 用户名
      if (aRemarkMatch !== bRemarkMatch) {
        return bRemarkMatch - aRemarkMatch
      }
      if (aNameMatch !== bNameMatch) {
        return bNameMatch - aNameMatch
      }

      return 0
    })

    // 应用分页
    const start = params.offset || 0
    const end = start + (params.limit || 20)
    const pagedResults = matches.slice(start, end)

    // 转换为标准格式
    const results = pagedResults.map(friend => ({
      uid: friend.id,
      username: friend.name || '',
      avatar: friend.avatar || '',
      gender: friend.gender,
      bio: friend.bio || '',
    }))

    console.log(`localSearchService: 好友搜索完成，找到 ${results.length} 个结果`)
    return results
  },

  /**
   * 搜索群聊
   *
   * 执行流程：
   * 1. 获取群聊列表数据
   * 2. 应用过滤条件（拥有的、加入的等）
   * 3. 匹配群名称和简介
   * 4. 应用分页
   *
   * 数据流：
   * - 输入：搜索参数
   * - 输出：群聊搜索结果列表
   *
   * 使用场景：
   * - 群聊列表搜索
   * - 查找特定群聊
   *
   * @param {LocalSearchParams} params - 搜索参数
   * @returns {Promise<GroupSearchResult[]>} 群聊搜索结果
   */
  async searchGroups (params: LocalSearchParams): Promise<GroupSearchResult[]> {
    console.log('localSearchService: 开始搜索群聊')
    const groupStore = useGroupStore()
    const groups = Array.from(groupStore.groups.values())

    // 执行搜索匹配
    const searchText = params.query.toLowerCase()
    const matches = groups.filter(group => {
      return (
        group.name?.toLowerCase().includes(searchText)
        || group.bio?.toLowerCase().includes(searchText)
      )
    })

    // 应用分页
    const start = params.offset || 0
    const end = start + (params.limit || 20)
    const pagedResults = matches.slice(start, end)

    // 转换为标准格式
    const results = pagedResults.map(group => ({
      gid: group.id,
      group_name: group.name || '',
      avatar: group.avatar || '',
      bio: group.bio || '',
    }))

    console.log(`localSearchService: 群聊搜索完成，找到 ${results.length} 个结果`)
    return results
  },

  /**
   * 搜索会话
   *
   * 执行流程：
   * 1. 获取会话列表数据
   * 2. 匹配会话名称和最后消息
   * 3. 应用分页
   *
   * 数据流：
   * - 输入：搜索参数
   * - 输出：会话搜索结果列表
   *
   * 使用场景：
   * - 会话列表搜索
   * - 快速定位特定会话
   *
   * @param {LocalSearchParams} params - 搜索参数
   * @returns {Promise<ChatSearchResult[]>} 会话搜索结果
   */
  async searchChats (params: LocalSearchParams): Promise<ChatSearchResult[]> {
    console.log('localSearchService: 开始搜索会话')
    const chatStore = useChatStore()
    const chats = chatStore.chatList

    // 执行搜索匹配
    const searchText = params.query.toLowerCase()
    const matches = chats.filter(chat => {
      return (
        chat.name?.toLowerCase().includes(searchText)
        || chat.lastMessage?.toLowerCase().includes(searchText)
      )
    })

    // 应用分页
    const start = params.offset || 0
    const end = start + (params.limit || 20)
    const pagedResults = matches.slice(start, end)

    // 转换为搜索结果格式
    const results = pagedResults.map(chat => ({
      chatId: chat.id,
      name: chat.name || '',
      type: chat.type === 'MesGroup' ? 'group' as const : 'private' as const,
      lastMessage: chat.lastMessage,
      unreadCount: chat.unreadCount,
      isPinned: chat.isPinned,
    }))

    console.log(`localSearchService: 会话搜索完成，找到 ${results.length} 个结果`)
    return results
  },

  /**
   * 搜索消息内容
   *
   * 执行流程：
   * 1. 确定搜索范围（特定会话或所有会话）
   * 2. 遍历消息数据
   * 3. 应用过滤条件（类型、日期等）
   * 4. 匹配消息内容
   * 5. 生成高亮片段
   * 6. 按时间排序
   * 7. 应用分页
   *
   * 数据流：
   * - 输入：搜索参数
   * - 输出：消息搜索结果列表
   *
   * 使用场景：
   * - 在聊天记录中查找特定消息
   * - 全局消息搜索
   *
   * @param {LocalSearchParams} params - 搜索参数
   * @returns {Promise<MessageSearchResult[]>} 消息搜索结果
   */
  async searchMessages (params: LocalSearchParams): Promise<MessageSearchResult[]> {
    console.log('localSearchService: 开始搜索消息')
    const results: MessageSearchResult[] = []
    const query = params.query.toLowerCase()
    const limit = params.limit || 20
    const offset = params.offset || 0

    // 获取要搜索的会话列表
    let chatIds: string[] = []
    if (params.filters?.chatIds?.length) {
      chatIds = params.filters.chatIds
    } else {
      // 搜索所有会话
      const chatStore = useChatStore()
      chatIds = chatStore.chatList.map(chat => chat.id)
    }

    // 遍历消息
    for (const chatId of chatIds) {
      // 获取群聊消息
      const groupMessages = messageService.groupMessages.get(chatId) || []
      // 获取私聊消息
      const privateMessages = messageService.privateMessages.get(chatId) || []

      const allMessages = [...groupMessages, ...privateMessages]

      for (const message of allMessages) {
        // 跳过系统消息和通知
        // (已删除 NOTIFICATION 和 SYSTEM 消息类型)
        if (message.type === MessageType.PING || message.type === MessageType.PONG) {
          continue
        }

        // 应用消息类型过滤
        if (params.filters?.messageTypes?.length
          && !params.filters.messageTypes.includes(message.type)) {
          continue
        }

        // 应用日期范围过滤
        if (params.filters?.dateRange) {
          const msgDate = new Date((message.payload.timestamp || 0) * 1000)
          if (msgDate < params.filters.dateRange.start
            || msgDate > params.filters.dateRange.end) {
            continue
          }
        }

        // 执行内容搜索
        const content = message.payload.detail || ''
        if (content.toLowerCase().includes(query)) {
          // 生成高亮片段
          const highlights = this.generateHighlights(content, query)

          results.push({
            messageId: message.payload.message_id || '',
            chatId,
            chatName: await this.getChatName(chatId),
            chatType: message.type === MessageType.MESGROUP ? 'group' : 'private',
            senderId: message.payload.sender_id || '',
            senderName: await this.getSenderName(message.payload.sender_id || ''),
            content,
            contentType: message.payload.content_type || ContentType.TEXT,
            timestamp: message.payload.timestamp || 0,
            highlights,
          })
        }
      }
    }

    // 按时间排序（最新的在前）
    results.sort((a, b) => b.timestamp - a.timestamp)

    // 应用分页
    const pagedResults = results.slice(offset, offset + limit)

    console.log(`localSearchService: 消息搜索完成，找到 ${pagedResults.length} 个结果`)
    return pagedResults
  },

  /**
   * 生成搜索高亮片段
   *
   * 执行流程：
   * 1. 定位关键词在文本中的位置
   * 2. 提取前后文作为上下文
   * 3. 添加省略号标记
   * 4. 返回高亮片段
   *
   * 数据流：
   * - 输入：消息内容和搜索关键词
   * - 输出：高亮片段数组
   *
   * 使用场景：
   * - 消息搜索结果的高亮显示
   * - 快速定位匹配内容
   *
   * @param {string} content - 消息内容
   * @param {string} query - 搜索关键词
   * @param {number} contextLength - 上下文长度，默认50
   * @returns {string[]} 高亮片段列表
   */
  generateHighlights (content: string, query: string, contextLength = 50): string[] {
    const highlights: string[] = []
    const queryIndex = content.toLowerCase().indexOf(query.toLowerCase())

    if (queryIndex === -1) {
      return highlights
    }

    // 生成前后文片段
    const start = Math.max(0, queryIndex - contextLength)
    const end = Math.min(content.length, queryIndex + query.length + contextLength)

    let snippet = content.slice(start, end)
    if (start > 0) {
      snippet = '...' + snippet
    }
    if (end < content.length) {
      snippet = snippet + '...'
    }

    highlights.push(snippet)
    return highlights
  },

  /**
   * 获取会话名称
   *
   * 执行流程：
   * 1. 从 chatStore 中查找会话
   * 2. 返回会话名称或 ID
   *
   * 数据流：
   * - 输入：会话ID
   * - 输出：会话名称
   *
   * 使用场景：
   * - 消息搜索结果中显示会话名称
   *
   * @param {string} chatId - 会话ID
   * @returns {Promise<string>} 会话名称
   */
  async getChatName (chatId: string): Promise<string> {
    const chatStore = useChatStore()
    const chat = chatStore.chatById(chatId)
    return chat?.name || chatId
  },

  /**
   * 获取发送者名称
   *
   * 执行流程：
   * 1. 从 friendStore 中查找好友
   * 2. 优先返回备注，其次返回用户名
   *
   * 数据流：
   * - 输入：用户ID
   * - 输出：用户名称
   *
   * 使用场景：
   * - 消息搜索结果中显示发送者名称
   *
   * @param {string} senderId - 发送者ID
   * @returns {Promise<string>} 发送者名称
   */
  async getSenderName (senderId: string): Promise<string> {
    const friendStore = useFriendStore()
    const friend = friendStore.getFriendByUid(senderId)
    return friend?.remark || friend?.name || senderId
  },
}
