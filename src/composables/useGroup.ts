import type {
  CreateGroupParams,
  DisbandGroupParams,
  GetGroupAnnouncementsParams,
  GetGroupCardParams,
  GetGroupMembersParams,
  GetGroupProfileParams,
  Group,
  GroupAnnouncement,
  GroupCard,
  GroupMember,
  GroupProfile,
  KickMemberParams,
  LeaveGroupParams,
  SetAdminParams,
  SetGroupInfoParams,
  TransferOwnershipParams,
} from '@/types/group'
import { computed } from 'vue'
import { useSnackbar } from '@/composables/useSnackbar'
import { groupService } from '@/service/groupService'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chatStore'
import { useGroupStore } from '@/stores/groupStore'
import {
  GroupRole,
} from '@/types/group'

export function useGroup () {
  const groupStore = useGroupStore()
  const authStore = useAuthStore()
  const { showSuccess, showError } = useSnackbar()

  // 获取当前用户ID
  const currentUserId = computed(() => authStore.userId || '')

  // Computed properties from store
  const allGroups = computed(() => groupStore.allGroups)
  const groupCount = computed(() => groupStore.groupCount)
  const isLoading = computed(() => groupStore.isLoading)

  // 获取用户所在的群聊
  const userGroups = computed(() => {
    if (!currentUserId.value) {
      return []
    }
    return allGroups.value.filter(group =>
      groupStore.isInGroup(group.id, currentUserId.value),
    )
  })

  // 获取用户管理的群聊（群主或管理员）
  const managedGroups = computed(() => {
    if (!currentUserId.value) {
      return []
    }
    return allGroups.value.filter(group =>
      groupStore.isGroupAdmin(group.id, currentUserId.value),
    )
  })

  // 获取用户拥有的群聊
  const ownedGroups = computed(() => {
    if (!currentUserId.value) {
      return []
    }
    return allGroups.value.filter(group =>
      groupStore.isGroupOwner(group.id, currentUserId.value),
    )
  })

  // 基础权限检查函数
  const checkPermissions = (gid: string, uid?: string) => {
    const targetUid = uid || currentUserId.value
    return {
      isOwner: groupStore.isGroupOwner(gid, targetUid),
      isAdmin: groupStore.isGroupAdmin(gid, targetUid),
      isMember: groupStore.isInGroup(gid, targetUid),
    }
  }

  // ==================== 初始化和重置方法 ====================

  /**
   * 初始化群聊模块
   *
   * 执行流程：
   * 1. 调用 groupService 获取群聊列表
   * 2. 转换数据格式
   * 3. 更新 groupStore
   * 4. 处理错误
   *
   * 数据流：
   * - 输入：forceRefresh参数
   * - 输出：更新 store 中的群聊列表
   * - 副作用：发送 HTTP 请求
   *
   * @param {boolean} forceRefresh 是否强制刷新
   * @returns {Promise<void>}
   */
  const init = async (forceRefresh = true): Promise<void> => {
    if (!forceRefresh && groupStore.groups.size > 0) {
      console.log('useGroup: 群聊列表已缓存，跳过获取')
      return
    }

    groupStore.setLoading(true)
    try {
      const groups = await groupService.getGroupList()
      groupStore.setGroups(groups)
      console.log('useGroup: 群聊列表获取成功')
    } catch (error) {
      console.error('useGroup: 获取群聊列表失败', error)
      showError('获取群聊列表失败，请刷新重试')
      throw error
    } finally {
      groupStore.setLoading(false)
    }
  }

  /**
   * 重置群聊模块状态
   *
   * 使用场景：
   * - 用户登出时清理数据
   */
  const reset = (): void => {
    groupStore.reset()
    console.log('useGroup: 重置群聊模块状态')
  }

  // ==================== 群聊操作方法 ====================

  /**
   * 创建群聊
   *
   * 执行流程：
   * 1. 验证创建参数
   * 2. 调用 groupService 创建群聊
   * 3. 处理成功/失败
   * 4. 更新 groupStore
   * 5. 显示用户反馈
   *
   * @param {CreateGroupParams} params 群聊创建参数
   * @returns {Promise<Group | null>} 创建的群聊对象或null
   */
  const createGroup = async (params: CreateGroupParams): Promise<Group | null> => {
    groupStore.setLoading(true)
    try {
      console.log('useGroup: 开始创建群聊', params)

      const group = await groupService.createGroup(params)

      // 更新本地状态
      groupStore._addGroupInternal(group)

      console.log('useGroup: 群聊创建成功', group.id)
      showSuccess('群聊创建成功')

      return group
    } catch (error: any) {
      console.error('useGroup: 创建群聊失败', error)
      showError(error.message || '创建群聊失败，请重试')
      return null
    } finally {
      groupStore.setLoading(false)
    }
  }

  /**
   * 更新群聊信息
   *
   * 执行流程：
   * 1. 验证更新参数
   * 2. 调用 groupService 更新群信息
   * 3. 处理成功/失败
   * 4. 更新 groupStore
   * 5. 显示用户反馈
   *
   * @param {SetGroupInfoParams} params 更新群信息的参数
   * @returns {Promise<void>}
   */
  const updateGroupInfo = async (params: SetGroupInfoParams): Promise<void> => {
    groupStore.setLoading(true)
    try {
      console.log('useGroup: 开始更新群信息', params)

      await groupService.setGroupInfo(params)

      // 更新本地状态 - groupStore
      groupStore._updateGroupInternal(params.gid, {
        name: params.group_name,
        avatar: params.group_avatar,
        group_intro: params.group_intro,
      })

      // 同步更新 chatStore 中的群聊会话（修复头像实时显示问题）
      const chatStore = useChatStore()
      const existingChat = chatStore.getChatByid(params.gid)
      if (existingChat && existingChat.type === 'group') {
        chatStore.addChat({
          ...existingChat,
          ...(params.group_avatar !== undefined && { avatar: params.group_avatar }),
          ...(params.group_name !== undefined && { name: params.group_name }),
        })
      }

      console.log('useGroup: 群信息更新成功')
      showSuccess('群信息更新成功')
    } catch (error: any) {
      console.error('useGroup: 更新群信息失败', error)
      showError(error.message || '更新群信息失败，请重试')
      throw error
    } finally {
      groupStore.setLoading(false)
    }
  }

  /**
   * 退出群聊
   *
   * 执行流程：
   * 1. 验证退出权限
   * 2. 调用 groupService 退出群聊
   * 3. 处理成功/失败
   * 4. 更新 groupStore
   * 5. 显示用户反馈
   *
   * @param {LeaveGroupParams} params 退出群聊的参数
   * @returns {Promise<void>}
   */
  const leaveGroup = async (params: LeaveGroupParams): Promise<void> => {
    groupStore.setLoading(true)
    try {
      console.log('useGroup: 开始退出群聊', params)

      await groupService.leaveGroup(params)

      // 更新本地状态
      groupStore._removeGroupInternal(params.gid)

      console.log('useGroup: 退出群聊成功')
      showSuccess('已退出群聊')
    } catch (error: any) {
      console.error('useGroup: 退出群聊失败', error)
      showError(error.message || '退出群聊失败，请重试')
      throw error
    } finally {
      groupStore.setLoading(false)
    }
  }

  /**
   * 踢出群成员
   *
   * 执行流程：
   * 1. 验证管理员权限
   * 2. 调用 groupService 踢出成员
   * 3. 处理成功/失败
   * 4. 更新 groupStore
   * 5. 显示用户反馈
   *
   * @param {KickMemberParams} params 踢出成员的参数
   * @returns {Promise<void>}
   */
  const kickMember = async (params: KickMemberParams): Promise<void> => {
    groupStore.setLoading(true)
    try {
      console.log('useGroup: 开始踢出成员', params)

      await groupService.kickMember(params)

      // 更新本地状态
      groupStore._removeGroupMemberInternal(params.gid, params.uid)

      console.log('useGroup: 踢出成员成功')
      showSuccess('成员已被踢出')
    } catch (error: any) {
      console.error('useGroup: 踢出成员失败', error)
      showError(error.message || '踢出成员失败，请重试')
      throw error
    } finally {
      groupStore.setLoading(false)
    }
  }

  /**
   * 解散群聊
   *
   * 执行流程：
   * 1. 验证群主权限
   * 2. 调用 groupService 解散群聊
   * 3. 处理成功/失败
   * 4. 更新 groupStore
   * 5. 显示用户反馈
   *
   * @param {DisbandGroupParams} params 解散群聊的参数
   * @returns {Promise<void>}
   */
  const disbandGroup = async (params: DisbandGroupParams): Promise<void> => {
    groupStore.setLoading(true)
    try {
      console.log('useGroup: 开始解散群聊', params)

      await groupService.disbandGroup(params)

      // 更新本地状态
      groupStore._removeGroupInternal(params.gid)

      console.log('useGroup: 解散群聊成功')
      showSuccess('群聊已解散')
    } catch (error: any) {
      console.error('useGroup: 解散群聊失败', error)
      showError(error.message || '解散群聊失败，请重试')
      throw error
    } finally {
      groupStore.setLoading(false)
    }
  }

  /**
   * 转让群主
   *
   * 执行流程：
   * 1. 验证群主权限
   * 2. 调用 groupService 转让群主
   * 3. 处理成功/失败
   * 4. 更新 groupStore
   * 5. 显示用户反馈
   *
   * @param {TransferOwnershipParams} params 转让群主的参数
   * @returns {Promise<void>}
   */
  const transferOwnership = async (params: TransferOwnershipParams): Promise<void> => {
    groupStore.setLoading(true)
    try {
      console.log('useGroup: 开始转让群主', params)

      await groupService.transferOwnership(params)

      // 更新本地状态 - 设置新成员为群主，原群主设为普通成员
      if (currentUserId.value) {
        groupStore._updateGroupMemberInternal(params.gid, params.uid, { role: GroupRole.OWNER })
        groupStore._updateGroupMemberInternal(params.gid, currentUserId.value, { role: GroupRole.MEMBER })
      }

      console.log('useGroup: 转让群主成功')
      showSuccess('群主转让成功')
    } catch (error: any) {
      console.error('useGroup: 转让群主失败', error)
      showError(error.message || '转让群主失败，请重试')
      throw error
    } finally {
      groupStore.setLoading(false)
    }
  }

  /**
   * 设置管理员
   *
   * 执行流程：
   * 1. 验证群主权限
   * 2. 调用 groupService 设置管理员
   * 3. 处理成功/失败
   * 4. 更新 groupStore
   * 5. 显示用户反馈
   *
   * @param {SetAdminParams} params 设置管理员的参数
   * @param {boolean} isSetAdmin 是否设置为管理员（true）或取消（false）
   * @returns {Promise<void>}
   */
  const setAdmin = async (params: SetAdminParams, isSetAdmin = true): Promise<void> => {
    groupStore.setLoading(true)
    try {
      console.log('useGroup: 开始设置管理员', { params, isSetAdmin })

      await groupService.setAdmin(params)

      // 更新本地状态
      const newRole = isSetAdmin ? GroupRole.ADMIN : GroupRole.MEMBER
      groupStore._updateGroupMemberInternal(params.gid, params.uid, { role: newRole })

      console.log('useGroup: 设置管理员成功')
      showSuccess(isSetAdmin ? '已设置管理员' : '已取消管理员权限')
    } catch (error: any) {
      console.error('useGroup: 设置管理员失败', error)
      showError(error.message || '设置管理员失败，请重试')
      throw error
    } finally {
      groupStore.setLoading(false)
    }
  }

  // ==================== 数据获取方法 ====================

  /**
   * 获取群聊名片
   *
   * 执行流程：
   * 1. 检查本地缓存
   * 2. 调用 groupService 获取名片
   * 3. 更新缓存
   * 4. 返回数据
   *
   * @param {GetGroupCardParams} params 获取名片的参数
   * @param {boolean} forceRefresh 是否强制刷新
   * @returns {Promise<GroupCard>} 群聊名片
   */
  const getGroupCard = async (params: GetGroupCardParams, forceRefresh = false): Promise<GroupCard> => {
    // 检查缓存
    const cached = groupStore.getGroupCard(params.gid)
    if (cached && !forceRefresh) {
      return cached
    }

    try {
      console.log('useGroup: 获取群聊名片', params)
      const apiResponse = await groupService.getGroupCard(params)

      // 更新缓存
      groupStore._setGroupCardInternal(apiResponse)

      return apiResponse
    } catch (error) {
      console.error('useGroup: 获取群聊名片失败', error)
      throw error
    }
  }

  /**
   * 获取群聊详细信息
   *
   * 执行流程：
   * 1. 检查本地缓存
   * 2. 调用 groupService 获取详细信息
   * 3. 更新缓存
   * 4. 返回数据
   *
   * @param {GetGroupProfileParams} params 获取详细信息的参数
   * @param {boolean} forceRefresh 是否强制刷新
   * @returns {Promise<GroupProfile>} 群聊详细信息
   */
  const getGroupProfile = async (params: GetGroupProfileParams, forceRefresh = false): Promise<GroupProfile> => {
    // 检查缓存
    const cached = groupStore.getGroupProfile(params.gid)
    if (cached && !forceRefresh) {
      return cached
    }

    try {
      console.log('useGroup: 获取群聊详细信息', params)
      const apiResponse = await groupService.getGroupProfile(params)

      // 更新缓存
      groupStore._setGroupProfileInternal(apiResponse)

      return apiResponse
    } catch (error) {
      console.error('useGroup: 获取群聊详细信息失败', error)
      throw error
    }
  }

  /**
   * 获取群成员列表
   *
   * 执行流程：
   * 1. 检查本地缓存
   * 2. 调用 groupService 获取成员列表
   * 3. 更新缓存
   * 4. 返回数据
   *
   * @param {GetGroupMembersParams} params 获取成员列表的参数
   * @param {boolean} forceRefresh 是否强制刷新
   * @returns {Promise<GroupMember[]>} 群成员列表
   */
  const getGroupMembers = async (params: GetGroupMembersParams, forceRefresh = false): Promise<GroupMember[]> => {
    // 检查缓存
    const cached = groupStore.getGroupMembers(params.gid)
    if (cached.length > 0 && !forceRefresh) {
      return cached
    }

    try {
      console.log('useGroup: 获取群成员列表', params)
      const apiResponse = await groupService.getGroupMembers(params)

      // 更新缓存
      groupStore.setGroupMembersFromApiResponse(params.gid, apiResponse)

      return groupStore.getGroupMembers(params.gid)
    } catch (error) {
      console.error('useGroup: 获取群成员列表失败', error)
      throw error
    }
  }

  /**
   * 获取群公告列表
   *
   * 执行流程：
   * 1. 检查本地缓存
   * 2. 调用 groupService 获取公告列表
   * 3. 更新缓存
   * 4. 返回数据
   *
   * @param {GetGroupAnnouncementsParams} params 获取公告列表的参数
   * @param {boolean} forceRefresh 是否强制刷新
   * @returns {Promise<GroupAnnouncement[]>} 群公告列表
   */
  const getGroupAnnouncements = async (params: GetGroupAnnouncementsParams, forceRefresh = false): Promise<GroupAnnouncement[]> => {
    // 检查缓存
    const cached = groupStore.getGroupAnnouncements(params.gid)
    if (cached.length > 0 && !forceRefresh) {
      return cached
    }

    try {
      console.log('useGroup: 获取群公告列表', params)
      const apiResponse = await groupService.getGroupAnnouncements(params)

      // 更新缓存
      groupStore.setGroupAnnouncementsFromApiResponse(params.gid, apiResponse)

      return apiResponse.announcements
    } catch (error) {
      console.error('useGroup: 获取群公告列表失败', error)
      throw error
    }
  }

  /**
   * 获取群成员在线状态
   *
   * 执行流程：
   * 1. 调用 groupService 获取在线状态
   * 2. 更新 groupStore 中群成员的 online_state 字段
   * 3. 确保当前用户始终显示为在线状态
   * 4. 触发响应式更新
   *
   * @param {string} gid - 群聊ID
   * @returns {Promise<void>}
   */
  const getGroupOnlineStatus = async (gid: string): Promise<void> => {
    try {
      const onlineUserIds = await groupService.getGroupOnlineStatus(gid)
      const members = groupStore.getGroupMembers(gid)
      const onlineSet = new Set(onlineUserIds)

      for (const member of members) {
        // 当前用户始终显示为在线状态
        const isOnline = member.id === currentUserId.value || onlineSet.has(member.id)
        groupStore._updateGroupMemberOnlineStateInternal(gid, member.id, isOnline)
      }
    } catch (error) {
      console.error('[群成员在线] 更新失败', error)
      // 静默失败，不影响群成员列表显示
    }
  }

  // ==================== 导出的方法和属性 ====================

  return {
    // State
    allGroups,
    userGroups,
    managedGroups,
    ownedGroups,
    groupCount,
    isLoading,
    currentUserId,

    // 初始化和重置
    init,
    reset,

    // 群聊操作
    createGroup,
    updateGroupInfo,
    leaveGroup,
    kickMember,
    disbandGroup,
    transferOwnership,
    setAdmin,

    // 数据获取
    getGroupCard,
    getGroupProfile,
    getGroupMembers,
    getGroupAnnouncements,
    getGroupOnlineStatus,

    // 权限检查
    checkPermissions,
  }
}
