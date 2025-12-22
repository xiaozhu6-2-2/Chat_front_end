// ./types/chat.ts

// 聊天类型定义
export enum ChatType {
  PRIVATE = 'private',
  GROUP = 'group',
}

// Chat interface for chat sessions
export interface Chat {
  id: string // pid/gid
  isPinned: boolean
  type: ChatType
  lastMessage?: string
  updatedAt?: string
  unreadCount: number
  avatar?: string
  name: string
}

// API响应的聊天数据结构
export interface ApiChat {
  id: string
  is_pinned: boolean
  type: ChatType
  latest_message?: string
  updated_at?: string
  unread_messages?: number
  avatar?: string
  remark?: string
}

// 将API响应转换为前端Chat类型
export function transformApiChat (apiChat: ApiChat): Chat {
  return {
    id: apiChat.id, // pid   fid->chat
    isPinned: apiChat.is_pinned,
    type: apiChat.type,
    lastMessage: apiChat.latest_message,
    updatedAt: apiChat.updated_at,
    unreadCount: apiChat.unread_messages || 0,
    avatar: apiChat.avatar,
    name: apiChat.remark || 'Unknown',
  }
}

// ==================== 聊天相关组件 Props ====================

/** 聊天区域 Props */
interface ChatAreaProps {
  chat: Chat
}

/** 聊天区域 Emits */
interface ChatAreaEmits {
  (e: 'imagePreview', imageUrl: string): void
}

/** 聊天列表 Props */
// 取消props，改用pinia缓存的活跃id
// interface ChatListProps {
//   activeChatId?: string;
// }

/** 聊天列表 Emits */
// interface ChatListEmits {
//   (e: 'chatSelected', chat: Chat): void;
// }

/** 消息气泡 Props */
interface MessageBubbleProps {
  message: LocalMessage
}

/** 消息气泡 Emits */
interface MessageBubbleEmits {
  (e: 'imagePreview', imageUrl: string): void
}

/** 虚拟消息列表 Props */
interface VirtualMessageListProps {
  messages: LocalMessage[]
  currentUserId?: string
  autoScroll?: boolean
  containerHeight?: number
}

/** 虚拟消息列表 Emits */
interface VirtualMessageListEmits {
  (e: 'imagePreview', imageUrl: string): void
  (e: 'scrollNearBottom', isNearBottom: boolean): void
}

/** 在线用户面板 Props */
interface OnlineBoardProps {
  modelValue?: boolean
}

export type {
  ChatAreaEmits,
  ChatAreaProps,
  MessageBubbleEmits,
  // ChatListEmits,
  MessageBubbleProps,
  OnlineBoardProps,
  VirtualMessageListEmits,
  VirtualMessageListProps,
}

// ==================== 组件 Props 默认值配置 ====================

/** 聊天区域默认值 */
export const ChatAreaDefaults = {
  chat: {
    id: '',
    name: '',
    type: 'private' as ChatType,
    unreadCount: 0,
  },
}

/** 虚拟消息列表默认值 */
export const VirtualMessageListDefaults = {
  currentUserId: '',
  autoScroll: true,
  containerHeight: 400,
}
