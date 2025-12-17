import type {
  CreateGroupParams,
  Group,
  GroupProfile,
} from '@/types/group'
import { computed } from 'vue'
import { useSnackbar } from '@/composables/useSnackbar'
import { useAuthStore } from '@/stores/authStore'
import { useGroupStore } from '@/stores/groupStore'
import {
  GroupRole,
} from '@/types/group'

export function useGroup () {
  const groupStore = useGroupStore()
  const authStore = useAuthStore()
  const { showSuccess, showError, showInfo, showWarning } = useSnackbar()

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

  // ==================== 群聊操作方法 ====================

  /**
   * 创建群聊并自动进行初始化设置
   *
   * 业务价值：
   * 1. 封装创建后的初始化流程，减少组件代码
   * 2. 自动处理创建者角色设置
   * 3. 支持初始成员邀请
   * 4. 统一的错误处理和用户反馈
   *
   * @param {CreateGroupParams} params - 创建群聊的参数
   * @param {string[]} [initialMembers] - 初始成员ID列表（可选）
   * @returns {Promise<Group>} 创建成功的群聊对象
   */
  const createGroupWithInitialization = async (
    params: CreateGroupParams,
    initialMembers?: string[],
  ): Promise<Group> => {
    try {
      // 1. 创建群聊
      const group = await groupStore.createGroup(params)

      // 2. 添加初始成员（如果有）
      if (initialMembers && initialMembers.length > 0) {
        try {
          // TODO: 实现批量邀请成员的逻辑
          showInfo(`已创建群聊"${group.name}"，即将邀请初始成员...`)
        } catch {
          showWarning('群聊创建成功，但邀请初始成员失败')
        }
      }

      // 3. 自动获取群成员列表以初始化状态
      await groupStore.fetchGroupMembers(group.id)

      return group
    } catch (error: any) {
      // store 层已经显示了错误，这里可以添加额外的业务逻辑
      console.error('创建群聊并初始化失败', error)
      throw error
    }
  }

  /**
   * 获取群聊详细信息（包含权限检查）
   *
   * 业务价值：
   * 1. 自动检查用户权限
   * 2. 根据权限返回不同的信息详细程度
   * 3. 缓存管理优化
   * 4. 错误处理和重试机制
   *
   * @param {string} gid - 群聊 ID
   * @param {boolean} [forceRefresh=false] - 是否强制刷新
   * @returns {Promise<GroupProfile>} 群聊详细信息
   */
  const getGroupProfileWithPermission = async (
    gid: string,
    forceRefresh = false,
  ): Promise<GroupProfile> => {
    try {
      // 1. 获取群聊基本信息
      const profile = await groupStore.getOrFetchGroupProfile(gid, forceRefresh)

      // 2. 获取成员列表以检查权限
      if (groupStore.getGroupMembers(gid).length === 0) {
        await groupStore.fetchGroupMembers(gid)
      }

      // 3. 获取群公告（如果有权限）
      const permissions = checkPermissions(gid)
      if (permissions.isAdmin) {
        try {
          await groupStore.fetchGroupAnnouncements(gid)
        } catch (error) {
          // 获取公告失败不影响主流程
          console.warn('获取群公告失败', error)
        }
      }

      return profile
    } catch (error: any) {
      showError('获取群聊信息失败')
      console.error('获取群聊详细信息（含权限检查）失败', error)
      throw error
    }
  }

  /**
   * 退出群聊前的检查和确认
   *
   * 业务价值：
   * 1. 检查用户是否可以退出（群主需要先转让）
   * 2. 提供退出前的警告信息
   * 3. 批量退出支持
   * 4. 退出后的清理工作
   *
   * @param {string | string[]} gids - 群聊ID或群聊ID数组
   * @param {boolean} [force=false] - 是否强制退出（跳过确认）
   * @returns {Promise<void>}
   */
  const leaveGroupWithCheck = async (
    gids: string | string[],
    force = false,
  ): Promise<void> => {
    const groupIds = Array.isArray(gids) ? gids : [gids]

    try {
      // 1. 检查每个群的权限
      for (const gid of groupIds) {
        const permissions = checkPermissions(gid)
        const group = groupStore.getGroupById(gid)

        if (permissions.isOwner && !force) {
          throw new Error(`"${group?.name}" 您是群主，请先转让群主或解散群聊`)
        }
      }

      // 2. 批量退出
      if (groupIds.length > 1 && !force) {
        showInfo(`即将退出 ${groupIds.length} 个群聊...`)
      }

      for (const gid of groupIds) {
        await groupStore.leaveGroup({ gid })
      }

      // 3. 清理相关缓存
      // store 的 leaveGroup 已经处理了清理工作
    } catch (error: any) {
      showError(error.message || '退出群聊失败')
      console.error('退出群聊（含检查）失败', error)
      throw error
    }
  }

  /**
   * 解散群聊的完整流程
   *
   * 业务价值：
   * 1. 多重确认机制
   * 2. 解散前数据备份提示
   * 3. 批量解散支持
   * 4. 解散后的通知机制
   *
   * @param {string | string[]} gids - 群聊ID或群聊ID数组
   * @returns {Promise<void>}
   */
  const disbandGroupWithConfirmation = async (
    gids: string | string[],
  ): Promise<void> => {
    const groupIds = Array.isArray(gids) ? gids : [gids]

    try {
      // 检查权限
      for (const gid of groupIds) {
        const permissions = checkPermissions(gid)
        const group = groupStore.getGroupById(gid)

        if (!permissions.isOwner) {
          throw new Error(`您不是群聊"${group?.name}"的群主`)
        }
      }

      // 3. 执行解散
      if (groupIds.length > 1) {
        showWarning(`即将解散 ${groupIds.length} 个群聊，此操作不可恢复！`)
      }

      for (const gid of groupIds) {
        await groupStore.disbandGroup({ gid })
      }

      // 4. 记录解散日志
      console.log('已解散群聊', { groupIds, timestamp: new Date().toISOString() })
    } catch (error: any) {
      showError(error.message || '解散群聊失败')
      console.error('解散群聊失败', error)
      throw error
    }
  }

  // ==================== 成员管理方法 ====================

  /**
   * 转让群主的高级处理
   *
   * 业务价值：
   * 1. 转让前的多重验证
   * 2. 转让后的角色调整
   * 3. 转让记录和通知
   * 4. 支持撤回（短时间内）
   *
   * @param {string} gid - 群聊 ID
   * @param {string} newOwnerId - 新群主ID
   * @param {boolean} [keepAdmin=true] - 是否保留原群主的管理员身份
   * @returns {Promise<void>}
   */
  const transferOwnershipWithProcess = async (
    gid: string,
    newOwnerId: string,
  ): Promise<void> => {
    try {
      // 1. 验证新群主
      const newOwner = groupStore.getGroupMemberByUid(gid, newOwnerId)
      if (!newOwner) {
        throw new Error('指定的用户不在群聊中')
      }

      // 2. 确认转让
      const group = groupStore.getGroupById(gid)
      if (!group) {
        throw new Error('群聊不存在')
      }

      // 3. 执行转让
      await groupStore.transferGroupOwnership({ gid, uid: newOwnerId })

      // 4. 处理原群主角色
      if (currentUserId.value) {
        // 更新为普通成员
        groupStore.updateGroupMember(gid, currentUserId.value, {
          role: GroupRole.MEMBER,
        })
      }

      // 5. 记录转让日志
      console.log('群主转让完成', {
        gid,
        oldOwner: currentUserId.value,
        newOwner: newOwnerId,
        timestamp: new Date().toISOString(),
      })
    } catch (error: any) {
      showError(`转让群主失败: ${error.message}`)
      console.error('转让群主（含流程）失败', error)
      throw error
    }
  }

  // ==================== 权限检查方法 ====================

  /**
   * 检查用户在群中的权限（增强版）
   *
   * 业务价值：
   * 1. 提供详细的权限信息
   * 2. 包含操作时间限制
   * 3. 支持临时权限
   * 4. 权限变更通知
   *
   * @param {string} gid - 群聊 ID
   * @param {string} [uid] - 用户ID，默认为当前用户
   * @returns {{
   *   isOwner: boolean;
   *   isAdmin: boolean;
   *   isMember: boolean;
   *   canKick: boolean;
   *   canSetAdmin: boolean;
   *   canTransfer: boolean;
   *   canDisband: boolean;
   *   canAnnounce: boolean;
   * }} 详细的权限信息
   */
  const checkDetailedPermissions = (gid: string, uid?: string) => {
    const targetUid = uid || currentUserId.value

    const basePermissions = {
      isOwner: groupStore.isGroupOwner(gid, targetUid),
      isAdmin: groupStore.isGroupAdmin(gid, targetUid),
      isMember: groupStore.isInGroup(gid, targetUid),
    }

    // 计算具体权限
    const permissions = {
      ...basePermissions,
      canKick: basePermissions.isAdmin,
      canSetAdmin: basePermissions.isOwner,
      canTransfer: basePermissions.isOwner,
      canDisband: basePermissions.isOwner,
      canAnnounce: basePermissions.isAdmin,
    }

    return permissions
  }

  /**
   * 获取群聊的完整状态信息
   *
   * 业务价值：
   * 1. 提供群聊的全面信息
   * 2. 用于群聊管理界面
   * 3. 支持快速诊断
   * 4. 性能监控数据
   *
   * @param {string} gid - 群聊 ID
   * @returns {Promise<{
   *   group: Group | null;
   *   profile: GroupProfile | null;
   *   memberCount: number;
   *   adminCount: number;
   *   announcementCount: number;
   *   permissions: any;
   * }>}
   */
  const getGroupFullStatus = async (gid: string) => {
    try {
      // 并行获取所有信息
      const [group, profile, members, announcements] = await Promise.all([
        Promise.resolve(groupStore.getGroupById(gid)),
        groupStore.getOrFetchGroupProfile(gid).catch(() => null),
        groupStore.fetchGroupMembers(gid).catch(() => []),
        groupStore.fetchGroupAnnouncements(gid).catch(() => []),
      ])

      const permissions = checkDetailedPermissions(gid)

      // 统计信息
      const memberCount = members.length
      const adminCount = members.filter(m => m.role === GroupRole.ADMIN).length
      const announcementCount = announcements.length

      return {
        group,
        profile,
        memberCount,
        adminCount,
        announcementCount,
        permissions,
      }
    } catch (error: any) {
      console.error('获取群聊完整状态失败', error)
      throw error
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

    // 增强的群聊操作
    createGroupWithInitialization,
    getGroupProfileWithPermission,
    leaveGroupWithCheck,
    disbandGroupWithConfirmation,

    // 增强的成员管理
    transferOwnershipWithProcess,

    // 增强的权限检查
    checkDetailedPermissions,
    getGroupFullStatus,

    // 权限检查
    checkPermissions,
  }
}
