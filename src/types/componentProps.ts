/**
 * 组件 Props 类型定义文件
 *
 * 统一管理所有 Vue 组件的 props 和 emits 接口
 * 提高代码可维护性和类型安全性
 */

// 导入基础类型
import type {
  // 好友相关类型
  FriendWithUserInfo,
  FriendRequest,
  UserSearchResult,
  UserProfile,

  // 聊天相关类型
  Chat,
  LocalMessage,

  // 消息相关类型
  ChatType,
  MessageType,
  ContentType,
  MessageStatus
} from '@/service/messageTypes';

// ==================== 联系人相关组件 Props ====================

/** 联系人信息基础接口 */
interface BaseContactInfo {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
  phone?: string;
  initial?: string;
  remark?: string;
}

/** 联系人卡片 Props */
interface ContactCardProps {
  contact: BaseContactInfo;
}

/** 群组信息接口 */
interface GroupInfo {
  id: string;
  name: string;
}

/** 群组卡片 Props */
interface GroupCardProps {
  group: GroupInfo;
}

/** 联系人列表 Props */
interface ContactListProps {
  activeItem?: { type: string; data: any } | null;
}

// ==================== 好友相关组件 Props ====================

/** 好友卡片 Props */
interface FriendCardProps {
  friend: FriendWithUserInfo;
}

/** 好友卡片 Emits */
interface FriendCardEmits {
  (e: 'chat', friend: FriendWithUserInfo): void;
  (e: 'remove', friend: FriendWithUserInfo): void;
  (e: 'edit-remark', friend: FriendWithUserInfo): void;
  (e: 'set-tag', friend: FriendWithUserInfo): void;
  (e: 'set-blacklist', friend: FriendWithUserInfo, isBlacklist: boolean): void;
}

/** 好友请求项 Props */
interface FriendRequestItemProps {
  request: FriendRequest;
  type: 'received' | 'sent';
}

/** 用户搜索结果卡片 Props */
interface UserSearchResultCardProps {
  user: UserSearchResult;
}

/** 好友列表面板 Emits */
interface FriendsListPanelEmits {
  (e: 'add-friend'): void;
  (e: 'chat', friend: FriendWithUserInfo): void;
  (e: 'remove', friend: FriendWithUserInfo): void;
  (e: 'edit-remark', friend: FriendWithUserInfo): void;
  (e: 'set-tag', friend: FriendWithUserInfo): void;
  (e: 'set-blacklist', friend: FriendWithUserInfo, isBlacklist: boolean): void;
}

/** 好友请求项 Emits */
interface FriendRequestItemEmits {
  (e: 'accept', request: FriendRequest): void;
  (e: 'reject', request: FriendRequest): void;
}

/** 用户搜索结果卡片 Emits */
interface UserSearchResultCardEmits {
  (e: 'send-request', user: UserSearchResult, message?: string): void;
  (e: 'handle-request', user: UserSearchResult): void;
}

// ==================== 聊天相关组件 Props ====================

/** 聊天区域 Props */
interface ChatAreaProps {
  chat: Chat;
}

/** 聊天列表 Props */
interface ChatListProps {
  activeChatId?: string;
}

/** 消息气泡 Props */
interface MessageBubbleProps {
  message: LocalMessage;
  currentUserId?: string;
}

/** 虚拟消息列表 Props */
interface VirtualMessageListProps {
  messages: LocalMessage[];
  currentUserId?: string;
  autoScroll?: boolean;
  containerHeight?: number;
}

/** 在线用户面板 Props */
interface OnlineBoardProps {
  modelValue?: boolean;
}

// ==================== 全局组件 Props ====================

/** 头像组件 Props */
interface AvatarProps {
  url?: string;
  size?: number | string;
  alt?: string;
  name?: string;
  clickable?: boolean;
  avatarClass?: string;
  variant?: 'flat' | 'text' | 'elevated' | 'tonal' | 'outlined' | 'plain';

  // 徽章属性
  showBadge?: boolean;
  badgeContent?: string | number;
  badgeColor?: string;
  badgeDot?: boolean;
  badgeInline?: boolean;
}

/** 联系人卡片模态框 Props */
interface ContactCardModalProps {
  contactInfo: BaseContactInfo;
  modelValue?: boolean;
}

/** 联系人卡片模态框 Emits */
interface ContactCardModalEmits {
  (e: 'update:modelValue', value: boolean): void;
  (e: 'send-message', contact: BaseContactInfo): void;
}

// ==================== 设置相关组件 Props ====================

/** 设置对话框 Props */
interface SettingsDialogProps {
  modelValue?: boolean;
}

/** 设置对话框 Emits */
interface SettingsDialogEmits {
  (e: 'update:modelValue', value: boolean): void;
}


// ==================== 导出所有接口 ====================

// Props 接口
export type {
  BaseContactInfo,
  GroupInfo,

  // 联系人相关
  ContactCardProps,
  GroupCardProps,
  ContactListProps,

  // 好友相关
  FriendCardProps,
  FriendRequestItemProps,
  UserSearchResultCardProps,

  // 聊天相关
  ChatAreaProps,
  ChatListProps,
  MessageBubbleProps,
  VirtualMessageListProps,
  OnlineBoardProps,

  // 全局组件
  AvatarProps,
  ContactCardModalProps,

  // 设置相关
  SettingsDialogProps
};

// Emits 接口
export type {
  // 好友相关
  FriendCardEmits,
  FriendsListPanelEmits,
  FriendRequestItemEmits,
  UserSearchResultCardEmits,

  // 全局组件
  ContactCardModalEmits,
  SettingsDialogEmits
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

