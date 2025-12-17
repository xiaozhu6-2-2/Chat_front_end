import type { UserProfileUpdateOptions } from '@/types/user'
import { userService } from '@/service/userService'
import { useUserStore } from '@/stores/userStore'
import { useSnackbar } from './useSnackbar'

/**
 * User Composable - 精简版
 * 根据新的 composable 分工标准，只保留真正有业务逻辑封装的方法
 *
 * 组件应该直接使用 userStore 获取状态和简单方法：
 * const userStore = useUserStore()
 * const currentUser = computed(() => userStore.currentUser)
 * const fetchCurrentUser = () => userStore.fetchCurrentUser()
 */
export function useUser () {
  const userStore = useUserStore()
  const { showSuccess } = useSnackbar()

  // 上传头像 - 涉及多个步骤的业务逻辑
  const uploadAvatar = async (file: File): Promise<string> => {
    try {
      console.log('useUser: 上传头像', file.name)
      const avatarUrl = await userService.uploadAvatar(file)

      // 更新 store 中的头像信息
      if (userStore.currentUser) {
        userStore.updateCurrentUser({ avatar: avatarUrl })
      }

      // 显示成功提示
      showSuccess('头像上传成功')

      return avatarUrl
    } catch (error) {
      console.error('useUser: 上传头像失败', error)
      throw error
    }
  }

  return {
    uploadAvatar,
  }
}
