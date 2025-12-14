// 用于好友、非好友、群聊、会话的最基础数据接口
interface BaseProfile {
  id: string;
  name: string;
  avatar: string;
}

export type { BaseProfile }