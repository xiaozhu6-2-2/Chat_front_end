/**
 * 搜索模块类型定义
 *
 * 功能：定义搜索相关的所有类型接口，包括搜索参数、结果类型和转换函数
 * 使用场景：为 search 模块提供类型安全保障，确保数据结构的一致性
 */

/**
 * 搜索类型枚举
 *
 * 说明：定义支持的搜索类型，用于在用户和群聊之间切换
 */
export enum SearchType {
  USER = 'user',
  GROUP = 'group',
}

/**
 * 搜索参数接口
 *
 * @property query - 搜索关键词，可以是 id、name 或 account
 * @property limit - 每页数量，默认 20
 * @property offset - 页面偏移量，默认 0
 */
export interface SearchParams {
  query: string
  limit?: number
  offset?: number
}

/**
 * 用户搜索结果
 *
 * 说明：缓存用户的基本必要信息，避免额外的 API 调用
 *
 * @property uid - 用户唯一标识
 * @property username - 用户名
 * @property avatar - 头像 URL，可为 null
 * @property gender - 性别，可选字段
 * @property bio - 个人简介，可选字段
 */
export interface UserSearchResult {
  uid: string
  username: string
  avatar: string | null
  gender?: string
  bio?: string
}

/**
 * 群聊搜索结果
 *
 * 说明：缓存群聊的基本必要信息
 *
 * @property gid - 群聊唯一标识
 * @property group_name - 群聊名称
 * @property avatar - 群聊头像
 * @property bio - 群聊简介
 */
export interface GroupSearchResult {
  gid: string
  group_name: string
  avatar: string
  bio: string
}

/**
 * 用户搜索 API 响应
 *
 * @property total_pages - 总页数
 * @property current_page - 当前页码
 * @property total_items - 总结果数
 * @property users - 用户结果列表
 */
export interface UserSearchResponse {
  total_pages: number
  current_page: number
  total_items: number
  users: Array<{
    uid: string
    username: string
    gender?: string
    avatar?: string | null
    bio?: string | null
  }>
}

/**
 * 群聊搜索 API 响应
 *
 * @property total_pages - 总页数
 * @property current_page - 当前页码
 * @property total_items - 总结果数
 * @property groups - 群聊结果列表
 */
export interface GroupSearchResponse {
  total_pages: number
  current_page: number
  total_items: number
  groups: Array<{
    gid: string
    group_name: string
    avatar: string
    bio: string
  }>
}

/**
 * 分页信息接口
 *
 * @property current_page - 当前页码
 * @property total_pages - 总页数
 * @property total_items - 总条目数
 * @property hasMore - 是否有更多数据
 */
export interface PaginationInfo {
  current_page: number
  total_pages: number
  total_items: number
  hasMore: boolean
}

/**
 * 搜索内部状态
 *
 * 说明：store 内部使用的完整状态结构
 */
export interface SearchState {
  query: string
  type: SearchType
  userResults: UserSearchResult[]
  groupResults: GroupSearchResult[]
  userPagination: PaginationInfo
  groupPagination: PaginationInfo
}

/**
 * 转换用户搜索结果数据
 *
 * 执行流程：
 * 1. 从 API 响应中提取必要字段
 * 2. 统一处理头像字段（undefined -> null）
 * 3. 返回标准化的用户搜索结果
 *
 * @param data - API 返回的用户数据
 * @returns 标准化的用户搜索结果
 */
export function transformUserSearchResult (data: any): UserSearchResult {
  return {
    uid: data.uid,
    username: data.username,
    avatar: data.avatar ?? null,
    gender: data.gender,
    bio: data.bio ?? null,
  }
}

/**
 * 转换群聊搜索结果数据
 *
 * 执行流程：
 * 1. 从 API 响应中提取必要字段
 * 2. 确保所有字段都有默认值
 * 3. 返回标准化的群聊搜索结果
 *
 * @param data - API 返回的群聊数据
 * @returns 标准化的群聊搜索结果
 */
export function transformGroupSearchResult (data: any): GroupSearchResult {
  return {
    gid: data.gid,
    group_name: data.group_name,
    avatar: data.avatar ?? '',
    bio: data.bio ?? '',
  }
}
