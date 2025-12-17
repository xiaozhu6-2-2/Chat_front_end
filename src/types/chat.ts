// ./types/chat.ts

// 聊天类型定义
enum ChatType {
  PRIVATE = 'private',
  GROUP = 'group',
}

// Chat interface for chat sessions
interface Chat {
  id: string // pid/gid
  isPinned: boolean
  type: ChatType
  lastMessage?: string
  updatedAt?: string
  unreadCount: number
  avatar?: string
  name: string
}

// 将API响应转换为前端Chat类型
export function transformApiChat (apiChat: any): Chat {
  return {
    id: apiChat.id, // pid   fid->chat
    isPinned: apiChat.is_pinned,
    type: apiChat.type,
    lastMessage: apiChat.latest_message,
    updatedAt: apiChat.updated_at,
    unreadCount: apiChat.unread_messages || 0,
    avatar: apiChat.avatar,
    name: apiChat.remark,
  }
}

// ==================== 聊天相关组件 Props ====================

/** 聊天区域 Props */
interface ChatAreaProps {
  chat: Chat;
}

/** 聊天区域 Emits */
interface ChatAreaEmits {
  (e: 'imagePreview', imageUrl: string): void;
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
  message: LocalMessage;
  currentUserId?: string;
}

/** 消息气泡 Emits */
interface MessageBubbleEmits {
  (e: 'imagePreview', imageUrl: string): void;
}

/** 虚拟消息列表 Props */
interface VirtualMessageListProps {
  messages: LocalMessage[];
  currentUserId?: string;
  autoScroll?: boolean;
  containerHeight?: number;
}

/** 虚拟消息列表 Emits */
interface VirtualMessageListEmits {
  (e: 'imagePreview', imageUrl: string): void;
  (e: 'scrollNearBottom', isNearBottom: boolean): void;
}

/** 在线用户面板 Props */
interface OnlineBoardProps {
  modelValue?: boolean;
}

export type {
  Chat,
  ChatType,
  ChatAreaProps,
  ChatAreaEmits,
  // ChatListEmits,
  MessageBubbleProps,
  MessageBubbleEmits,
  VirtualMessageListProps,
  VirtualMessageListEmits,
  OnlineBoardProps
}


// ==================== 组件 Props 默认值配置 ====================

/** 聊天区域默认值 */
export const ChatAreaDefaults = {
  chat: {
    id: '',
    name: '',
    type: 'private' as ChatType,
    unreadCount: 0
  }
};

/** 虚拟消息列表默认值 */
export const VirtualMessageListDefaults = {
  currentUserId: '',
  autoScroll: true,
  containerHeight: 400
};