import type { BaseProfile } from './global'

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
