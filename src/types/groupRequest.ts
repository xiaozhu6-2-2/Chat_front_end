/**
 * 群聊申请模块类型定义
 *
 * 本文件定义了群聊申请相关的所有类型，包括：
 * - 状态枚举
 * - 核心实体接口
 * - API 请求/响应类型
 * - 数据转换函数
 *
 * @author echat
 * @since 2025-12-16
 */

import type { BaseProfile } from './global'

/**
 * 群聊申请状态枚举
 *
 * PENDING: 待处理
 * ACCEPTED: 已接受
 * REJECTED: 已拒绝
 * EXPIRED: 已过期
 */
export enum GroupRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}

/**
 * 核心群聊申请接口
 *
 * 包含申请的基本信息，通过可选字段来存储不同场景的附加数据
 */
export interface GroupRequest {
  /** 申请ID */
  req_id: string
  /** 群聊ID */
  gid: string
  /** 申请人ID */
  sender_uid: string
  /** 申请信息 */
  apply_text: string
  /** 创建时间 */
  create_time: number
  /** 申请状态 */
  status: GroupRequestStatus
  /** 缓存的关联数据 */
  /** 用户申请记录时显示的群信息 */
  groupProfile?: BaseProfile
  /** 审核申请时显示的申请用户信息 */
  userProfile?: BaseProfile
}

/**
 * 发送群聊申请请求参数
 */
export interface SendGroupRequestParams {
  /** 群聊ID */
  gid: string
  /** 申请信息 */
  apply_text: string | null
}

/**
 * 响应群聊申请请求参数
 */
export interface RespondGroupRequestParams {
  /** 申请ID */
  req_id: string
  /** 操作类型：accept 同意，reject 拒绝 */
  action: 'accept' | 'reject'
}


/**
 * 发送群聊申请响应
 */
export interface SendGroupRequestResponse {
  /** 申请ID */
  req_id: string
  /** 群聊ID */
  gid: string
  /** 群聊名称 */
  group_name: string
  /** 群聊头像 */
  group_avatar?: string
  /** 申请人ID */
  sender_uid: string
  /** 申请信息 */
  apply_text: string
  /** 创建时间 */
  create_time: number
  /** 申请状态 */
  status: GroupRequestStatus
}

/**
 * 用户群聊申请列表响应
 */
export interface UserGroupRequestListResponse {
  /** 总数 */
  total: number
  /** 申请列表 */
  requests: Array<{
    /** 申请ID */
    req_id: string
    /** 群聊ID */
    gid: string
    /** 群聊名称 */
    group_name: string
    /** 群聊头像 */
    group_avatar?: string
    /** 申请人ID */
    sender_uid: string
    /** 申请信息 */
    apply_text: string
    /** 创建时间 */
    create_time: number
    /** 申请状态 */
    status: GroupRequestStatus
  }>
}

/**
 * 群聊审核申请列表响应
 */
export interface GroupApprovalListResponse {
  /** 总数 */
  total: number
  /** 申请列表 */
  requests: Array<{
    /** 申请ID */
    req_id: string
    /** 群聊ID */
    gid: string
    /** 群聊名称 */
    group_name: string
    /** 群聊头像 */
    group_avatar?: string
    /** 申请人ID */
    sender_uid: string
    /** 申请人名称 */
    sender_name: string
    /** 申请人头像 */
    sender_avatar?: string
    /** 申请信息 */
    apply_text: string
    /** 创建时间 */
    create_time: number
    /** 申请状态 */
    status: GroupRequestStatus
  }>
}

/**
 * 响应群聊申请响应
 */
export interface RespondGroupRequestResponse {
  /** 是否成功 */
  success: boolean
}

/**
 * 从API响应转换用户群聊申请数据
 *
 * 执行流程：
 * 1. 提取API返回的基础字段
 * 2. 构建群聊的 BaseProfile 信息
 * 3. 返回完整的 GroupRequest 对象
 *
 * @param data API响应数据
 * @returns GroupRequest 转换后的申请对象
 */
export function transformUserGroupRequestFromApi(data: any): GroupRequest {
  return {
    req_id: data.req_id,
    gid: data.gid,
    sender_uid: data.sender_uid,
    apply_text: data.apply_text,
    create_time: data.create_time,
    status: data.status,
    groupProfile: {
      id: data.gid,
      name: data.group_name,
      avatar: data.group_avatar || ''
    }
  }
}

/**
 * 从API响应转换群聊审核申请数据
 *
 * 执行流程：
 * 1. 提取API返回的基础字段
 * 2. 构建群聊的 BaseProfile 信息（包含群头像）
 * 3. 构建申请用户的 BaseProfile 信息
 * 4. 返回完整的 GroupRequest 对象
 *
 * @param data API响应数据
 * @returns GroupRequest 转换后的申请对象
 */
export function transformGroupApprovalFromApi(data: any): GroupRequest {
  return {
    req_id: data.req_id,
    gid: data.gid,
    sender_uid: data.sender_uid,
    apply_text: data.apply_text,
    create_time: data.create_time,
    status: data.status,
    groupProfile: {
      id: data.gid,
      name: data.group_name,
      avatar: data.group_avatar || ''
    },
    userProfile: {
      id: data.sender_uid,
      name: data.sender_name,
      avatar: data.sender_avatar || ''
    }
  }
}

/**
 * 从API响应转换发送群聊申请响应数据
 *
 * @param data API响应数据
 * @returns SendGroupRequestResponse 转换后的响应对象
 */
export function transformSendGroupRequestResponse(data: any): SendGroupRequestResponse {
  return {
    req_id: data.req_id,
    gid: data.gid,
    group_name: data.group_name,
    group_avatar: data.group_avatar || '',
    sender_uid: data.sender_uid,
    apply_text: data.apply_text,
    create_time: data.create_time,
    status: data.status
  }
}

/**
 * 通用群聊申请转换函数
 *
 * 根据数据类型自动选择合适的转换函数
 *
 * @param data API响应数据
 * @param type 数据类型：'user' | 'approval' | 'send'
 * @returns GroupRequest 转换后的申请对象
 */
export function transformGroupRequestFromApi(
  data: any,
  type: 'user' | 'approval' | 'send'
): GroupRequest {
  switch (type) {
    case 'user':
      return transformUserGroupRequestFromApi(data)
    case 'approval':
      return transformGroupApprovalFromApi(data)
    case 'send':
      return {
        req_id: data.req_id,
        gid: data.gid,
        sender_uid: data.sender_uid,
        apply_text: data.apply_text,
        create_time: data.create_time,
        status: data.status,
        groupProfile: {
          id: data.gid,
          name: data.group_name,
          avatar: data.group_avatar || ''
        }
      }
    default:
      throw new Error(`Unknown transformation type: ${type}`)
  }
}