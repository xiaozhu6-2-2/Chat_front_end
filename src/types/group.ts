// 群聊模块类型定义
import type { BaseProfile } from './global'

// ==================== 枚举类型 ====================

// 群成员角色枚举
export enum GroupRole {
  OWNER = 'owner', // 群主
  ADMIN = 'admin', // 管理员
  MEMBER = 'member', // 普通成员
}

// 群类型枚举
export enum GroupType {
  NORMAL = 'normal', // 普通群
  LARGE = 'large', // 大群（500人以上）
  SUPER = 'super', // 超大群（2000人以上）
}

// ==================== 基础数据类型 ====================

// 群聊基本信息（继承 BaseProfile，id 就是 gid）
export interface Group extends BaseProfile {
  group_intro?: string // 群简介
}

// 群聊名片（API 26: 用户获取群聊名片）
export interface GroupCard extends Group {
  manager_uid: string // 群主ID
  created_at: number // 创建时间
}

// 群聊详细信息（API 27: 成员获取群聊信息）
export interface GroupProfile extends GroupCard {
  do_not_disturb: boolean // 是否免打扰
  is_pinned: boolean // 是否置顶
  remark: string | null // 群备注
  nickname: string | null // 群昵称
  join_time: number // 加入时间
}

// 群成员信息
export interface GroupMember extends BaseProfile {
  // uid: BaseProfile.id
  // username: BaseProfile.name
  // avatar: BaseProfile.avatar
  role: GroupRole // 角色
  nickname?: string // 群昵称
}

// 群公告信息
export interface GroupAnnouncement {
  msg_id: string // 消息ID
  gid: string // 群ID
  content: string // 公告内容
  sender_uid: string // 发布者ID
  send_time: number // 发布时间
  mentioned_uids?: string[] // 提及的用户ID数组
  quote_msg_id?: string | null // 引用的消息ID
}

// ==================== API 参数和响应类型 ====================

// 创建群聊参数
export interface CreateGroupParams {
  group_name: string
  avatar?: string
  group_intro?: string
}

// 创建群聊响应
export interface CreateGroupResponse {
  gid: string
  created_at: number
}

// 获取群聊名片参数
export interface GetGroupCardParams {
  gid: string
}

// 获取群聊信息参数
export interface GetGroupProfileParams {
  gid: string
}

// 获取群聊列表响应
export interface GetGroupListResponse {
  groups: Array<{
    gid: string
    group_name: string
    avatar: string
    bio: string // 注意：API返回的是bio，内部统一为group_intro
  }>
  total: number
}

// 退出群聊参数
export interface LeaveGroupParams {
  gid: string
}

// 踢出成员参数
export interface KickMemberParams {
  gid: string
  uid: string
}

// 解散群聊参数
export interface DisbandGroupParams {
  gid: string
}

// 设置成员信息参数
export interface SetMemberParams {
  gid: string
  do_not_disturb?: boolean
  is_pinned?: boolean
  remark?: string
  nickname?: string
}

// 设置群信息参数
export interface SetGroupInfoParams {
  gid: string
  group_name?: string
  group_avatar?: string
  group_intro?: string
}

// 获取群公告参数
export interface GetGroupAnnouncementsParams {
  gid: string
}

// 获取群公告响应
export interface GetGroupAnnouncementsResponse {
  announcements: GroupAnnouncement[]
  total: number
}

// 获取群成员参数
export interface GetGroupMembersParams {
  gid: string
}

// 获取群成员响应
export interface GetGroupMembersResponse {
  members: Array<{
    role: string
    uid: string
    username: string
    avatar: string
    nickname: string
  }>
  total: number
}

// 转让群主参数
export interface TransferOwnershipParams {
  gid: string
  uid: string
}

// 设置管理员参数
export interface SetAdminParams {
  gid: string
  uid: string
}

// ==================== 向后兼容的类型定义 ====================

// API 响应中的原始 GroupCard 格式（使用 gid/group_name）
export interface GroupCardFromAPI {
  gid: string // 群聊编号
  group_name: string // 群聊名称
  manager_uid: string // 群主ID
  avatar: string // 群头像
  group_intro: string // 群简介
  created_at: number // 创建时间
}

// API 响应中的原始 GroupProfile 格式（使用 gid/group_name）
export interface GroupProfileFromAPI {
  gid: string // 群聊编号
  group_name: string // 群聊名称
  manager_uid: string // 群主ID
  avatar: string // 群头像
  group_intro: string // 群简介
  created_at: number // 创建时间
  do_not_disturb: boolean // 是否免打扰
  is_pinned: boolean // 是否置顶
  remark: string | null // 群备注
  nickname: string | null // 群昵称
  join_time: number // 加入时间
}

// API 响应中的原始 GroupMember 格式
export interface GroupMemberFromAPI {
  role: string
  uid: string
  username: string
  avatar: string
  nickname: string
}

// 更新响应类型为使用 API 格式
export type GroupCardResponse = GroupCardFromAPI
export type GroupProfileResponse = GroupProfileFromAPI

// ==================== 数据转换函数 ====================

// 将 API 的 GroupCard 转换为内部 GroupCard
export function transformGroupCardFromAPI (apiData: GroupCardFromAPI): GroupCard {
  return {
    id: apiData.gid,
    name: apiData.group_name,
    avatar: apiData.avatar,
    manager_uid: apiData.manager_uid,
    group_intro: apiData.group_intro,
    created_at: apiData.created_at,
  }
}

// 将 API 的 GroupProfile 转换为内部 GroupProfile
export function transformGroupProfileFromAPI (apiData: GroupProfileFromAPI): GroupProfile {
  return {
    id: apiData.gid,
    name: apiData.group_name,
    avatar: apiData.avatar,
    manager_uid: apiData.manager_uid,
    group_intro: apiData.group_intro,
    created_at: apiData.created_at,
    do_not_disturb: apiData.do_not_disturb,
    is_pinned: apiData.is_pinned,
    remark: apiData.remark,
    nickname: apiData.nickname,
    join_time: apiData.join_time,
  }
}

// 将API群聊列表响应转换为Group
export function transformGroupListFromApi (apiData: GetGroupListResponse): Group[] {
  return apiData.groups.map(group => ({
    id: group.gid,
    name: group.group_name,
    avatar: group.avatar || '',
    group_intro: group.bio, // API返回bio，转换为group_intro
  }))
}

// 将创建群聊响应转换为Group
export function transformCreateGroupFromApi (apiData: CreateGroupResponse, params: CreateGroupParams): Group {
  return {
    id: apiData.gid,
    name: params.group_name,
    avatar: params.avatar || '',
    group_intro: params.group_intro,
  }
}

// 将GroupCard转换为Group（用于获取基本信息）
export function transformGroupCardToGroup (card: GroupCard): Group {
  return {
    id: card.id,
    name: card.name,
    avatar: card.avatar,
    group_intro: card.group_intro,
  }
}

// 将GroupProfile转换为Group（用于获取基本信息）
export function transformGroupProfileToGroup (profile: GroupProfile): Group {
  return {
    id: profile.id,
    name: profile.name,
    avatar: profile.avatar,
    group_intro: profile.group_intro,
  }
}

export function transformGroupProfileToGroupCard (profile: GroupProfile) {
  return {
    id: profile.id,
    name: profile.name,
    avatar: profile.avatar,
    group_intro: profile.group_intro,
    manager_uid: profile.manager_uid,
    created_at: profile.created_at,
  }
}

// 将API响应转换为GroupMember
export function transformGroupMemberFromApi (apiData: GroupMemberFromAPI): GroupMember {
  return {
    id: apiData.uid,
    name: apiData.username,
    role: apiData.role as GroupRole,
    avatar: apiData.avatar,
    nickname: apiData.nickname,
  }
}

// 获取群ID的辅助函数
export function getGroupId (group: Group | GroupCard | GroupProfile): string {
  return group.id
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

export type {
    GroupInfo,
    GroupCardProps
}