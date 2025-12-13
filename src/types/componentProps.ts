/**
 * 组件 Props 类型定义文件
 *
 * 统一管理所有 Vue 组件的 props 和 emits 接口
 * 提高代码可维护性和类型安全性
 */

// 导入基础类型
import type {
  // 好友相关类型
  FriendRequest,
  UserSearchResult,

  // 聊天相关类型
  Chat,
  LocalMessage,

  // 消息相关类型
  ChatType,
  MessageType,
  ContentType,
  MessageStatus
} from '@/service/messageTypes';

import type { FriendWithUserInfo } from './friend';


// ==================== 好友相关组件 Props ====================


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
interface ChatListProps {
  activeChatId?: string;
}

/** 聊天列表 Emits */
interface ChatListEmits {
  (e: 'chatSelected', chat: Chat): void;
}

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

// ==================== 全局组件 Props ====================




// ==================== 设置相关组件 Props ====================




// ==================== 导出所有接口 ====================

// Props 接口
export type {
  // 好友相关
  // 聊天相关
  ChatAreaProps,
  ChatListProps,
  MessageBubbleProps,
  VirtualMessageListProps,
  OnlineBoardProps,

};



// Emits 接口
export type {
  // 好友相关
  
  // 聊天相关
  ChatAreaEmits,
  ChatListEmits,
  MessageBubbleEmits,
  VirtualMessageListEmits,

};

// ==================== 组件 Props 默认值配置 ====================

/** 联系人卡片默认值 */
export const ContactCardDefaults = {
  contact: {
    id: '',
    name: '',
    avatar: '',
    email: '',
    phone: '',
    initial: '',
    remark: ''
  }
};

/** 头像组件默认值 */
export const AvatarDefaults = {
  size: 40,
  clickable: false,
  variant: 'elevated' as const,
  showBadge: false,
  badgeDot: false,
  badgeInline: false
};

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

