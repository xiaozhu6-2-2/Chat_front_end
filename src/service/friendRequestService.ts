import type {
  FriendRequest,
  FriendRequestListResponse,
} from '@/types/friendRequest'
import { useSnackbar } from '@/composables/useSnackbar'
import { authApi } from './api'

const { showError } = useSnackbar()

export const friendRequestService = {
  // 发送好友请求
  async sendFriendRequest (receiver_id: string, message: string) {
    console.log('friendRequestService: 发送好友请求', { receiver_id, message })
    try {
      const response = await authApi.post('/auth/friends/request', {
        receiver_id,
        message,
      })
      if (response.status === 200) {
        console.log('friendRequestService: 发送好友请求成功', response.data)
        return response.data
      }
    } catch (error) {
      console.error('friendRequestService: 发送好友请求失败', error)
      // 错误由拦截器统一处理，这里只需抛出
      throw error
    }
  },

  // 响应好友请求
  async respondFriendRequest (req_id: string, action: 'accept' | 'reject') {
    console.log('friendRequestService: 响应好友请求', { req_id, action })
    try {
      const response = await authApi.post('/auth/friends/respond', {
        req_id,
        action,
      })
      if (response.status === 200) {
        console.log('friendRequestService: 响应好友请求成功', response.data)
        return response.data
      }
    } catch (error) {
      console.error('friendRequestService: 响应好友请求失败', error)
      throw error
    }
  },

  // 获取好友请求列表
  async getFriendRequestList (): Promise<FriendRequestListResponse> {
    console.log('friendRequestService: 获取好友请求列表')
    try {
      const response = await authApi.get('/auth/friends/request_list')
      if (response.status === 200) {
        console.log('friendRequestService: 获取好友请求列表成功', response.data)
        return response.data
      }
      throw new Error('获取好友请求列表失败')
    } catch (error) {
      console.error('friendRequestService: 获取好友请求列表失败', error)
      throw error
    }
  },
}
