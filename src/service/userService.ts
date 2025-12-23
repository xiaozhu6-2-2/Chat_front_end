/**
 * 用户服务层 - 处理用户信息管理
 * 负责用户相关的CRUD操作，不包括隐私设置、活跃度统计和搜索功能
 */

import type { User, UserProfileUpdateOptions } from '@/types/user'
import { UserApiToUser } from '@/types/user'
import { authApi } from './api'
import axios from 'axios'

export const userService = {
  /**
   * 获取当前用户详细信息
   * @returns User对象
   */
  async getCurrentUser (): Promise<User> {
    try {
      console.log('userService: 获取当前用户信息')
      const response = await authApi.get('/user/user-info')

      if (response.status === 200) {
        const userData = UserApiToUser(response.data)
        console.log('userService: 获取用户信息成功')
        return userData
      } else {
        throw new Error(`获取用户信息失败：${response.status}`)
      }
    } catch (error) {
      console.error('userService: 获取用户信息失败', error)
      throw error
    }
  },

  /**
   * 更新用户信息
   * @param options 更新选项
   * @returns 更新后的User对象
   */
  async updateProfile (options: UserProfileUpdateOptions): Promise<User> {
    try {
      console.log('userService: 更新用户信息', options)

      // 检查是否至少传入了一个更新项
      if (!options || Object.keys(options).length === 0) {
        console.warn('userService: 更新用户信息必须要有一项更改')
        throw new Error('更新用户信息必须要有一项更改')
      }

      // 构建请求参数，确保所有字段都在请求体中，未修改的字段设置为null
      const params = {
        username: options.username ?? null,
        gender: options.gender ?? null,
        region: options.region ?? null,
        email: options.email ?? null,
        avatar: options.avatar ?? null,
        bio: options.bio ?? null,
      }

      const response = await authApi.post('/user/update-user-info', params)

      if (response.status === 200) {
        console.log('userService: 更新用户信息成功，API返回', response.data)
        // API只返回success，不返回用户数据，需要重新获取
        return {} as User
      } else {
        throw new Error(`更新用户信息失败：${response.status}`)
      }
    } catch (error) {
      console.error('userService: 更新用户信息失败', error)
      throw error
    }
  },

  /**
   * 上传用户头像
   * @param file 头像文件
   * @returns 头像URL
   */
  async uploadAvatar (file: File): Promise<string> {
    try {
      console.log('userService: 上传头像', file.name)

      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        throw new Error('只能上传图片文件')
      }

      // 验证文件大小 (5MB)
      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        throw new Error('头像文件大小不能超过5MB')
      }

      // 创建FormData
      const formData = new FormData()
      formData.append('avatar', file)

      const response = await authApi.post('/user/upload-avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      if (response.status === 200) {
        const avatarUrl = response.data.url
        console.log('userService: 上传头像成功', avatarUrl)
        return avatarUrl
      } else {
        throw new Error(`上传头像失败：${response.status}`)
      }
    } catch (error) {
      console.error('userService: 上传头像失败', error)
      throw error
    }
  },

  /**
   * 使用文件ID更新用户头像
   * @param fileId 上传后的文件ID
   * @returns 更新结果
   */
  async updateUserAvatar (fileId: string): Promise<{ success: boolean }> {
    try {
      console.log('userService: 更新用户头像', fileId)
      const response = await authApi.post('/user/update-user-avatar', {
        file_id: fileId
      })

      if (response.status === 200 && response.data?.success) {
        console.log('userService: 更新头像成功')
        return { success: true }
      } else {
        throw new Error(response.data?.message || '更新头像失败')
      }
    } catch (error) {
      console.error('userService: 更新头像失败', error)
      throw error
    }
  },

  /**
   * 使用临时token更新用户头像（用于注册等特殊场景）
   * @param fileId 上传后的文件ID
   * @param token 临时认证token
   * @returns 更新结果
   */
  async updateUserAvatarWithTempToken (fileId: string, token: string): Promise<{ success: boolean }> {
    try {
      console.log('userService: 使用临时token更新用户头像', fileId)

      // 创建临时API实例
      const baseURL = import.meta.env.VITE_API_BASE_URL
      const tempAuthApi = axios.create({
        baseURL: `${baseURL}/auth`,
        timeout: 10_000,
      })

      // 设置认证头
      tempAuthApi.defaults.headers.common['Authorization'] = `Bearer ${token}`

      const response = await tempAuthApi.post('/user/update-user-avatar', {
        file_id: fileId
      })

      if (response.status === 200 && response.data?.success) {
        console.log('userService: 更新头像成功')
        return { success: true }
      } else {
        throw new Error(response.data?.message || '更新头像失败')
      }
    } catch (error) {
      console.error('userService: 更新头像失败', error)
      throw error
    }
  },
}
