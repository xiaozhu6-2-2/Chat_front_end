/**
 * 本地搜索类型定义
 *
 * 定义本地搜索相关的接口、枚举和类型
 */

import type {
  ContentType,
  MessageType,
} from './message'
import type {
  GroupSearchResult,
  UserSearchResult,
} from './search'

/**
 * 本地搜索类型枚举
 *
 * 定义可搜索的本地数据类型
 */
export enum LocalSearchType {
  FRIEND = 'friend', // 好友搜索
  GROUP = 'group', // 群聊搜索
  CHAT = 'chat', // 会话搜索
  MESSAGE = 'message', // 消息内容搜索
  ALL = 'all', // 全局搜索
}

/**
 * 本地搜索参数接口
 *
 * 执行流程：
 * 1. 接收搜索关键词和类型
 * 2. 应用过滤条件（如果有）
 * 3. 支持分页参数
 *
 * 数据流：
 * - 输入：查询词、搜索类型、过滤条件、分页参数
 * - 输出：标准化的搜索参数对象
 *
 * 使用场景：
 * - Composable 层调用 Service 层时传递参数
 * - 搜索历史记录的参数存储
 *
 * @interface LocalSearchParams
 */
export interface LocalSearchParams {
  /** 搜索关键词 */
  query: string
  /** 搜索类型 */
  type: LocalSearchType
  /** 返回结果数量限制，默认20 */
  limit?: number
  /** 结果偏移量，用于分页 */
  offset?: number
  /** 过滤条件 */
  filters?: {
    /** 好友搜索：是否包含黑名单用户 */
    includeBlacklisted?: boolean
    /** 好友搜索：按标签过滤 */
    tags?: string[]
    /** 消息搜索：按消息类型过滤 */
    messageTypes?: MessageType[]
    /** 消息搜索：按日期范围过滤 */
    dateRange?: {
      start: Date
      end: Date
    }
    /** 消息搜索：限制在特定会话中搜索 */
    chatIds?: string[]
  }
}

/**
 * 消息搜索结果接口
 *
 * 执行流程：
 * 1. 从消息缓存中匹配内容
 * 2. 关联会话信息和发送者信息
 * 3. 生成高亮片段
 *
 * 数据流：
 * - 输入：LocalMessage 对象
 * - 输出：标准化的消息搜索结果
 *
 * 使用场景：
 * - 消息内容搜索的结果展示
 * - 搜索历史中消息结果的存储
 *
 * @interface MessageSearchResult
 */
export interface MessageSearchResult {
  /** 消息ID */
  messageId: string
  /** 所属会话ID */
  chatId: string
  /** 会话名称 */
  chatName: string
  /** 会话类型 */
  chatType: 'private' | 'group'
  /** 发送者ID */
  senderId: string
  /** 发送者名称 */
  senderName: string
  /** 消息内容 */
  content: string
  /** 消息内容类型 */
  contentType: ContentType
  /** 消息时间戳 */
  timestamp: number
  /** 高亮片段列表 */
  highlights: string[]
}

/**
 * 会话搜索结果接口
 *
 * 执行流程：
 * 1. 匹配会话名称或最后消息
 * 2. 包聚会话相关信息
 * 3. 计算未读数量等信息
 *
 * 数据流：
 * - 输入：Chat 对象
 * - 输出：标准化的会话搜索结果
 *
 * 使用场景：
 * - 会话搜索的结果展示
 * - 搜索历史中会话结果的存储
 *
 * @interface ChatSearchResult
 */
export interface ChatSearchResult {
  /** 会话ID */
  chatId: string
  /** 会话名称 */
  name: string
  /** 会话类型 */
  type: 'private' | 'group'
  /** 最后消息内容 */
  lastMessage?: string
  /** 未读消息数量 */
  unreadCount?: number
  /** 是否置顶 */
  isPinned?: boolean
  /** 参与者名称列表（群聊） */
  participantNames?: string[]
}

/**
 * 综合搜索结果接口
 *
 * 执行流程：
 * 1. 聚合各类型的搜索结果
 * 2. 按类型分组返回
 * 3. 保持结果独立性
 *
 * 数据流：
 * - 输入：各类搜索结果
 * - 输出：统一的结果对象
 *
 * 使用场景：
 * - 全局搜索（ALL 类型）的结果返回
 * - Store 层存储搜索结果
 * - 搜索历史记录的存储
 *
 * @interface LocalSearchResult
 */
export interface LocalSearchResult {
  /** 好友搜索结果 */
  friends: UserSearchResult[]
  /** 群聊搜索结果 */
  groups: GroupSearchResult[]
  /** 会话搜索结果 */
  chats: ChatSearchResult[]
  /** 消息搜索结果 */
  messages: MessageSearchResult[]
}

/**
 * 搜索结果统计接口
 *
 * 执行流程：
 * 1. 计算各类型结果数量
 * 2. 汇总总结果数
 * 3. 提供给UI展示统计信息
 *
 * 数据流：
 * - 输入：LocalSearchResult
 * - 输出：统计数据
 *
 * 使用场景：
 * - 搜索结果页面的统计信息展示
 * - 搜索性能分析
 *
 * @interface LocalSearchStats
 */
export interface LocalSearchStats {
  /** 好友结果数量 */
  totalFriends: number
  /** 群聊结果数量 */
  totalGroups: number
  /** 会话结果数量 */
  totalChats: number
  /** 消息结果数量 */
  totalMessages: number
  /** 总结果数量 */
  totalResults: number
}

/**
 * 搜索历史记录接口
 *
 * 执行流程：
 * 1. 记录搜索关键词和时间
 * 2. 限制历史记录数量
 * 3. 支持清空和删除
 *
 * 数据流：
 * - 输入：搜索关键词
 * - 输出：历史记录条目
 *
 * 使用场景：
 * - 搜索框的下拉历史提示
 * - 搜索历史的管理
 *
 * @interface SearchHistoryItem
 */
export interface SearchHistoryItem {
  /** 搜索关键词 */
  query: string
  /** 搜索时间 */
  timestamp: number
  /** 搜索类型 */
  type: LocalSearchType
}
