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
export function transformFriendRequestFromApi (data: any): FriendRequest {
  return {
    req_id: data.req_id,
    sender_uid: data.sender_uid,
    receiver_uid: data.receiver_uid,
    apply_text: data.apply_text,
    create_time: data.create_time,
    status: data.status,
    userProfile: data.userProfile, // 添加用户资料缓存
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