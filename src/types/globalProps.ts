/**
 * 组件 Props 类型定义文件
 *
 * 统一管理所有 Vue 组件的 props 和 emits 接口
 * 提高代码可维护性和类型安全性
 */




/** 群组信息接口 */
interface GroupInfo {
  id: string;    // 群组唯一标识
  name: string;  // 群组名称
}


/**
 * 群组卡片组件 Props
 * 从父组件(contactList)接收群组信息，用于展示群组基本信息
 */
interface GroupCardProps {
  group: GroupInfo; // 从父组件传递的群组信息对象
}





/**
 * 用户搜索结果卡片组件 Props
 * 从父组件(UserSearchPanel)接收搜索结果数据
 */
interface UserSearchResultCardProps {
  user: UserSearchResult; // 用户搜索结果数据，包含用户基本信息
}


/**
 * 好友请求项组件 Emits
 * 用户处理好友请求时触发，通知父组件更新请求状态
 */
interface FriendRequestItemEmits {
  (e: 'accept', request: FriendRequest): void; // 接受好友请求时触发，传递给父组件执行接受操作
  (e: 'reject', request: FriendRequest): void; // 拒绝好友请求时触发，传递给父组件执行拒绝操作
}

/**
 * 用户搜索结果卡片组件 Emits
 * 用户操作搜索结果时触发，通知父组件进行相应处理
 */
interface UserSearchResultCardEmits {
  (e: 'send-request', user: UserSearchResult, message?: string, tags?: string[]): void; // 发送好友请求时触发，传递给父组件执行发送请求操作
  (e: 'handle-request', user: UserSearchResult): void; // 处理已有关系时触发，传递给父组件处理特殊状态（如已发送、已是好友等）
}

/**
 * 标签对话框组件 Props
 * 从父组件接收标签编辑相关数据
 */
interface TagDialogProps {
  modelValue: boolean; // 控制对话框显示/隐藏，v-model绑定
  friend: FriendWithUserInfo; // 要编辑标签的好友信息对象
}

/**
 * 标签对话框组件 Emits
 * 用户操作对话框时触发
 */
interface TagDialogEmits {
  (e: 'update:modelValue', value: boolean): void; // 更新对话框显示状态时触发，用于v-model双向绑定
  (e: 'tag-updated', friendId: string, tag: string | null): void; // 标签更新完成时触发，传递给父组件更新好友标签
}

// ==================== 聊天相关组件 Props ====================

/**
 * 聊天区域组件 Props
 * 从父组件(chat.vue)接收当前选中的聊天信息
 */
interface ChatAreaProps {
  chat: Chat; // 当前聊天对象信息，包含聊天ID、名称、类型等
}

/**
 * 聊天区域组件 Emits
 * 用户操作时触发，通知父组件进行相应处理
 */
interface ChatAreaEmits {
  (e: 'imagePreview', imageUrl: string): void; // 用户点击图片预览时触发，传递给父组件显示大图查看器
}



/**
 * 消息气泡组件 Props
 * 从父组件(VirtualMessageList)接收单个消息数据
 */
interface MessageBubbleProps {
  message: LocalMessage; // 单条消息对象，包含消息内容、发送者、时间等
  currentUserId?: string; // 当前用户ID，用于区分是本人消息还是他人消息
}

/**
 * 消息气泡组件 Emits
 * 用户操作消息时触发
 */
interface MessageBubbleEmits {
  (e: 'imagePreview', imageUrl: string): void; // 用户点击消息中的图片时触发，向上传递用于图片预览
}

/**
 * 虚拟消息列表组件 Props
 * 从父组件(chatArea.vue)接收消息列表和配置参数
 */
interface VirtualMessageListProps {
  messages: LocalMessage[]; // 消息列表数组，来自父组件
  currentUserId?: string; // 当前用户ID，用于区分消息归属
  autoScroll?: boolean; // 是否自动滚动到底部，新消息到达时
  containerHeight?: number; // 容器高度，用于虚拟滚动计算
}

/**
 * 虚拟消息列表组件 Emits
 * 滚动状态变化时触发，通知父组件
 */
interface VirtualMessageListEmits {
  (e: 'imagePreview', imageUrl: string): void; // 用户点击图片时触发，向上传递给父组件
  (e: 'scrollNearBottom', isNearBottom: boolean): void; // 滚动位置接近底部时触发，通知父组件是否需要自动滚动
}

/**
 * 在线用户面板组件 Props
 * 控制面板的显示/隐藏状态
 */
interface OnlineBoardProps {
  modelValue?: boolean; // 控制在线用户面板显示/隐藏，v-model绑定
}

// ==================== 全局组件 Props ====================

/**
 * 头像组件 Props
 * 通用头像组件，用于显示用户头像
 */
interface AvatarProps {
  url?: string; // 头像图片URL
  size?: number | string; // 头像尺寸，默认40px
  alt?: string; // 图片无法加载时的替代文本
  name?: string; // 用户名，用于生成默认头像文字
  clickable?: boolean; // 是否可点击，用于绑定点击事件
  avatarClass?: string; // 自定义CSS类名
  variant?: 'flat' | 'text' | 'elevated' | 'tonal' | 'outlined' | 'plain'; // Vuetify按钮变体样式

  // 徽章属性 - 用于显示未读消息、在线状态等
  showBadge?: boolean; // 是否显示徽章
  badgeContent?: string | number; // 徽章内容，如未读消息数量
  badgeColor?: string; // 徽章颜色
  badgeDot?: boolean; // 是否为点状徽章
  badgeInline?: boolean; // 是否内联显示
}

/**
 * 头像组件 Emits
 * 用户交互时触发
 */
interface AvatarEmits {
  (e: 'click', event: MouseEvent): void; // 头像被点击时触发，仅在clickable为true时生效
}



// ==================== 设置相关组件 Props ====================

/**
 * 设置对话框组件 Props
 * 应用设置入口组件
 */
interface SettingsDialogProps {
  modelValue?: boolean; // 控制设置对话框显示/隐藏，v-model绑定
}

/**
 * 设置对话框组件 Emits
 * 用户操作设置时触发
 */
interface SettingsDialogEmits {
  (e: 'update:modelValue', value: boolean): void; // 更新对话框显示状态，用于v-model双向绑定
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
  TagDialogProps,

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
  // 联系人相关
  ContactListEmits,

  // 好友相关
  FriendCardEmits,
  FriendsListPanelEmits,
  FriendRequestItemEmits,
  UserSearchResultCardEmits,
  TagDialogEmits,

  // 聊天相关
  ChatAreaEmits,
  ChatListEmits,
  MessageBubbleEmits,
  VirtualMessageListEmits,

  // 全局组件
  AvatarEmits,
  ContactCardModalEmits,

  // 设置相关
  SettingsDialogEmits
};

// ==================== 组件 Props 默认值配置 ====================



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

