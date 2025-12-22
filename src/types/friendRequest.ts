import type { FriendWithUserInfo } from './friend'
import type { BaseProfile } from './global'
import type { UserSearchResult } from './search'

// 好友请求状态
export enum FriendRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

// 发送好友请求参数
export interface SendFriendRequestParams {
  receiver_id: string
  message: string
}

// 响应好友请求参数
export interface RespondFriendRequestParams {
  req_id: string
  action: 'accept' | 'reject'
}

// 好友请求接口
export interface FriendRequest {
  req_id: string
  sender_uid: string
  receiver_uid: string
  apply_text: string
  create_time: number
  status: FriendRequestStatus
  userProfile?: BaseProfile // id, 头像，姓名缓存
}

// API 响应格式
export interface FriendRequestListResponse {
  total: number
  requests: FriendRequest[] // 发送的请求
  receives: FriendRequest[] // 收到的请求
}

// 转换 API 数据
export function transformFriendRequestFromApi (data: any, type: 'sent' | 'received'): FriendRequest {
  // 根据类型决定userProfile应该包含谁的信息
  let userProfile: BaseProfile

  if (type === 'sent') {
    // 如果是发送的请求，userProfile应该包含接收者的信息
    userProfile = {
      id: data.receiver_uid,
      name: data.receiver_name || `用户${data.receiver_uid}`,
      avatar: data.receiver_avatar || ''
    }
  } else {
    // 如果是接收的请求，userProfile应该包含发送者的信息
    userProfile = {
      id: data.sender_uid,
      name: data.sender_name || `用户${data.sender_uid}`,
      avatar: data.sender_avatar || ''
    }
  }

  return {
    req_id: data.req_id,
    sender_uid: data.sender_uid,
    receiver_uid: data.receiver_uid,
    apply_text: data.apply_text,
    create_time: data.create_time,
    status: data.status,
    userProfile, // 根据类型设置用户资料缓存
  }
}
//--------------------------------组件props和emit---------------------------------------
/** 好友请求项 Props */
export interface FriendRequestItemProps {
  request: FriendRequest;
  type: 'received' | 'sent';
}

/** 用户搜索结果卡片 Props */
export interface UserSearchResultCardProps {
  user: UserSearchResult;
}

/** 好友列表面板 Emits */
export interface FriendsListPanelEmits {
  (e: 'add-friend'): void;
  (e: 'chat', friend: FriendWithUserInfo): void;
  (e: 'remove', friend: FriendWithUserInfo): void;
  (e: 'edit-remark', friend: FriendWithUserInfo): void;
  (e: 'set-tag', friend: FriendWithUserInfo): void;
  (e: 'set-blacklist', friend: FriendWithUserInfo, isBlacklist: boolean): void;
}

/** 好友请求项 Emits */
export interface FriendRequestItemEmits {
  (e: 'accept', request: FriendRequest): void;
  (e: 'reject', request: FriendRequest): void;
}

/** 用户搜索结果卡片 Emits */
export interface UserSearchResultCardEmits {
  (e: 'send-request', user: UserSearchResult, message?: string, tags?: string[]): void;
  (e: 'handle-request', user: UserSearchResult): void;
}