import type { BaseProfile } from './global'

// ==================== 基础数据类型 ====================

// 用户信息接口 - 继承自BaseProfile
export interface User extends BaseProfile {
  account?: string // 账号
  gender?: string // 性别
  region?: string // 地区
  email?: string // 邮箱
  bio?: string // 个人简介
  createdAt?: string // 创建时间
}

// 从API获取的用户信息响应体
export interface UserFromApi {
  uid: string
  account: string
  username: string
  avatar: string
  gender?: string
  region?: string
  email?: string
  bio?: string
  created_at?: string
}

// 更新用户信息的请求参数
export interface UpdateUserProfileParams {
  username?: string
  gender?: string
  region?: string
  email?: string
  avatar?: string
  bio?: string
}

// 更新用户资料的选项接口
export interface UserProfileUpdateOptions {
  username?: string
  gender?: string
  region?: string
  email?: string
  avatar?: string
  bio?: string
}

// // 头像上传响应
// export interface AvatarUploadResponse {
//   url: string;      // 头像URL
//   filename: string; // 文件名
//   size: number;     // 文件大小
// }

// ==================== 转换函数 ====================

// 将API响应转换为User对象
export function UserApiToUser (apiData: UserFromApi): User {
  return {
    id: apiData.uid,
    name: apiData.username,
    avatar: apiData.avatar,
    account: apiData.account,
    gender: apiData.gender,
    region: apiData.region,
    email: apiData.email,
    bio: apiData.bio,
    createdAt: apiData.created_at,
  }
}

// ==================== 导出 ====================

// 类型已通过 export type 导出，函数已通过 export 导出
