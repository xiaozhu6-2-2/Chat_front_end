//./types/chat.ts

// 聊天类型定义
enum ChatType {
  PRIVATE = 'private',
  GROUP = 'group'
}

// Chat interface for chat sessions
interface Chat {
  id: string; //pid/gid
  isPinned: boolean;
  type: ChatType;
  lastMessage?: string;
  updatedAt?: string;
  unreadCount: number;
  avatar?: string;
  name: string;
}


// 将API响应转换为前端Chat类型
export function transformApiChat(apiChat: any): Chat {
  return {
    id: apiChat.id, //pid   fid->chat
    isPinned: apiChat.is_pinned,
    type: apiChat.type,
    lastMessage: apiChat.latest_message,
    updatedAt: apiChat.updated_at,
    unreadCount: apiChat.unread_messages || 0,
    avatar: apiChat.avatar,
    name: apiChat.remark
  };
}


export type {
  ChatType,
  Chat
}
