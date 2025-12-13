/**
 * Message and Chat type definitions
 * Unified chat and message type definitions
 */

// 聊天类型定义
enum ChatType {
  PRIVATE = 'private',
  GROUP = 'group'
}

// 消息类型定义 - 区分消息的传递方向和类型
enum MessageType {
  PRIVATE = 'Private',      // 私聊消息
  GROUP = 'Group',          // 群聊消息
  NOTIFICATION = 'Notification', // 系统通知
  SYSTEM = 'System',        // 系统消息
  PING = 'Ping',            // 心跳包
  PONG = 'Pong',            // 心跳响应
  ACK = 'Ack'               // 消息确认
}

// 消息内容类型定义 - 区分消息的内容形式
enum ContentType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  VOICE = 'voice',
  VIDEO = 'video',
  SYSTEM = 'system',
  FRIEND = 'friend'
}

// 消息状态定义 - 统一发送状态
enum MessageStatus {
  PENDING = 'pending',    // 等待发送
  SENDING = 'sending',    // 发送中
  SENT = 'sent',          // 已发送
  DELIVERED = 'delivered', // 已送达
  READ = 'read',          // 已读
  FAILED = 'failed'       // 发送失败
}

// Chat interface for chat sessions
interface Chat {
  id: string;
  name: string;
  avatar?: string;
  type: ChatType;
  lastMessage?: string;
  unreadCount: number;
  isActive?: boolean;
  updatedAt?: string;
}

// Sender information interface
interface SenderInfo {
  id: string;
  name: string;
  avatar?: string;
}

interface Message {
  type: MessageType;      // 消息类型：私聊/群聊/通知/系统等

  payload: {
    messageId?: string;   // 时间戳+随机数，保证唯一性，由基类生成
    timestamp?: number;   // 由基类生成
    chatId?: string;      // 群聊是receiverId/私聊是两个用户的senderId组合，由小到大
    senderId?: string;
    receiverId?: string;
    contentType?: ContentType; // 内容类型：text/image/file等，决定detail的识别方法;对于通知消息，是通知类型
    detail?: string;
  };

  print(): void;         // 日志输出
  saveCheck(): Boolean;
}

//前端消息，用于增设前端需要的新增字段，接收和存储都使用localMessage，发送的时候使用message
class LocalMessage implements Message {
  type: MessageType;

  payload: {
    messageId?: string;
    timestamp?: number;
    chatId?: string;
    senderId?: string;
    receiverId?: string;
    contentType?: ContentType;
    detail?: string;
  };

  //仅在前端使用的字段
  sendStatus?: MessageStatus;
  userIsSender?: Boolean;

  constructor(type: MessageType, payload: Message['payload']) {
    this.type = type;
    this.payload = { ...payload };

    if (!this.payload.messageId) {
      this.payload.messageId = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
    }

    if (!this.payload.timestamp) {
      this.payload.timestamp = Date.now();
    }

    // 只有在没有chatId且满足条件时才生成
    if (!this.payload.chatId && (type === MessageType.GROUP || type === MessageType.PRIVATE) &&
        this.payload.senderId && this.payload.receiverId) {
      this.payload.chatId = this.generateChatId(type, this.payload.senderId, this.payload.receiverId);
    }
  }

  generateChatId(type: MessageType, senderId: string, receiverId: string): string {
    if (type === MessageType.GROUP) {
      return `${receiverId}`
    } else if (type === MessageType.PRIVATE) {
      //由小到大拼接两个用户的senderId
      const sortedIds = [senderId, receiverId].sort();
      return `${sortedIds[0]}-${sortedIds[1]}`
    } else {
      return "";
    }
  }

  print(): void {
    console.log(`type: ${this.type}, payload: ${this.payload}`);
  }

  saveCheck(): Boolean {
    const requiredFields = [
      this.type,
      this.payload.messageId,
      this.payload.timestamp,
      this.payload.senderId
    ];

    return requiredFields.every(field => field != null && field !== '');
  }

  static toLocalMessage(message: Message): LocalMessage {
    return new LocalMessage(message.type, message.payload);
  }
}

class MessageText extends LocalMessage {
  //需要senderId, receiverId, contentType, detail
  constructor(type: MessageType, payload: Omit<Message['payload'], 'messageId' | 'timestamp'>) {
    super(type, payload);
  }
}

class MessagePing extends LocalMessage {
  constructor(senderId: string) {
    //心跳，需要senderId
    super(MessageType.PING, { senderId: senderId });
  }
}

class MessagePong extends LocalMessage {
  constructor(senderId: string) {
    //响应心跳，需要senderId
    super(MessageType.PONG, { senderId: senderId });
  }
}

// Component props interfaces
interface ChatItemProps {
  chat: Chat;
  isActive?: boolean;
}

interface ChatListProps {
  chats: Chat[];
  activeChatId?: string;
}

interface ChatAreaProps {
  chat: Chat;
}

// // 好友接口定义（基于数据库设计）
// interface UserProfile {
//   uid: string;               // 用户编号
//   username: string;          // 用户名
//   account: string;           // 账号
//   gender: 'male' | 'female' | 'other';
//   region?: string;           // 地区
//   email?: string;            // 联系方式
//   create_time: string;       // 创建时间
//   avatar?: string;           // 头像
//   bio?: string;              // 简介
// }
// 群聊接口定义 
// 展示群聊详细信息
interface GroupProfile {
  gid: string,               // 群聊编号
  groupname: string,         // 群名
  manager_uid: string,       // 群主id
  avatar: string,            // 头像
  groupintro: string,        // 群介绍
  createdAt: string,         // 创建时间
}
// 用户搜索结果（用于添加好友页面）
interface UserSearchResult extends FriendWithUserInfo {
  is_friend: boolean;        // 是否已是好友
  request_sent: boolean;     // 是否已发送好友请求
  request_received: boolean; // 是否收到对方请求
}
// 群聊搜索结果（用于加入群聊）
interface GroupSearchResult extends GroupProfile{
  isIn: boolean;             // 是否已在群中
  request_sent: boolean;     // 是否已发送加群请求
}



// // 用于展示好友信息
// interface FriendWithUserInfo {
//   fid: string;               // 好友编号
//   uid: string;               // 好友用户ID
//   create_time: string;       // 添加时间
//   is_blacklist: boolean;     // 是否黑名单
//   remark?: string;           // 备注
//   group_by?: string;              // 分组标签
//   user_info?: UserProfile;    // 用户详细信息, 当用户获取好友详细资料后，缓存在这里。
// }

// 好友请求（对应 friend_request 表）
interface FriendRequest {
  req_id: string;              // 申请编号
  sender_uid: string;          // 发送者编号
  receiver_uid: string;        // 接收者编号
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  apply_text?: string;         // 申请文本
  create_time: string;         // 申请时间
  handle_time?: string;        // 处理时间
  sender_info?: UserProfile;   // 发送者信息
  receiver_info?: UserProfile; // 接收者信息
}

// 好友通知的 detail 结构
interface FriendNotificationDetail {
  action: 'friend_request' | 'friend_response' | 'friend_added' | 'friend_removed';
  req_id?: string;           // 申请编号（用于请求相关）
  sender_uid?: string;       // 发送者用户ID
  receiver_uid?: string;     // 接收者用户ID
  status?: 'accepted' | 'rejected'; // 响应状态（用于响应相关）
  apply_text?: string;       // 申请文本（用于请求）
  user_info?: UserProfile;   // 用户信息
}

export type {
  Message,
  Chat,
  SenderInfo,
  ChatItemProps,
  ChatListProps,
  ChatAreaProps,
  GroupProfile,
  UserSearchResult,
  GroupSearchResult,
  FriendRequest,
  FriendNotificationDetail
};
export { LocalMessage, MessageText, MessagePing, MessagePong, MessageStatus, ChatType, MessageType, ContentType };