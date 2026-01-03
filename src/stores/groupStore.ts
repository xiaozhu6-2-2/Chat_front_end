import type {
  GetGroupAnnouncementsResponse,
  GetGroupListResponse,
  GetGroupMembersResponse,
  Group,
  GroupAnnouncement,
  GroupCard,
  GroupMember,
  GroupProfile,
} from '@/types/group'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  GroupRole,
  transformGroupListFromApi,
  transformGroupMemberFromApi,
  transformGroupProfileToGroup,
} from '@/types/group'

export const useGroupStore = defineStore('group', () => {
  // State
  const groups = ref<Map<string, Group>>(new Map()) // id(gid) -> group
  const groupCards = ref<Map<string, GroupCard>>(new Map()) // gid -> card (缓存)
  const groupProfiles = ref<Map<string, GroupProfile>>(new Map()) // gid -> profile (缓存)
  const groupMembers = ref<Map<string, GroupMember[]>>(new Map()) // gid -> members[]
  const groupAnnouncements = ref<Map<string, GroupAnnouncement[]>>(new Map()) // gid -> announcements[]
  const isLoading = ref(false)
  const lastFetchTime = ref<number>(0) // 上次获取群聊列表的时间
  const groupsVersion = ref(0) // 版本号，用于强制触发 computed 更新（解决 Map 响应式问题）

  // Computed
  /**
   * 获取所有群聊列表
   *
   * 使用场景：
   * - 群聊列表页面展示
   * - 群聊搜索和筛选
   * - 下拉刷新时的数据源
   *
   * @returns {Group[]} 群聊列表数组（按 ID 倒序排列）
   */
  const allGroups = computed(() => {
    // 访问 groupsVersion 确保 computed 追踪 Map 的变化
    // 这是解决 Vue 3 中 ref(Map) 响应式问题的方案
    // 参考: https://github.com/vuejs/core/issues/9318
    // eslint-disable-next-line no-unused-vars
    const _ = groupsVersion.value
    return Array.from(groups.value.values())
  })

  /**
   * 获取群聊数量
   *
   * 使用场景：
   * - 首页显示群聊数量
   * - 统计面板显示
   * - 验证是否加载了群聊数据
   *
   * @returns {number} 群聊总数
   */
  const groupCount = computed(() => {
    return groups.value.size
  })

  // Actions
  /**
   * 设置加载状态
   *
   * 使用场景：
   * - 开始数据请求时设置为 true
   * - 请求完成（成功或失败）后设置为 false
   * - 防止重复请求
   *
   * @param {boolean} loading - 加载状态
   */
  const setLoading = (loading: boolean) => {
    isLoading.value = loading
    console.log(`groupStore: 设置加载状态 ${loading ? '开启' : '关闭'}`)
  }

  // ==================== 群聊管理方法 ====================

  /**
   * 内部方法：添加群聊（不包含API调用）
   *
   * 使用场景：
   * - Composable层创建群聊后更新本地状态
   * - 批量初始化群聊列表
   * - 合并外部数据源
   *
   * @param {Group} group - 群聊对象
   */
  const _addGroupInternal = (group: Group) => {
    groups.value.set(group.id, group)
    groupsVersion.value++ // 触发响应式更新
    console.log(`groupStore: 添加群聊 ${group.id}`)
  }

  /**
   * 内部方法：批量添加群聊（不包含API调用）
   *
   * 使用场景：
   * - 初始化群聊列表
   * - 合并外部群聊数据
   * - 批量更新群聊信息
   *
   * @param {Group[]} groupList - 群聊列表
   */
  const _addGroupsInternal = (groupList: Group[]) => {
    for (const group of groupList) {
      groups.value.set(group.id, group)
    }
    console.log(`groupStore: 批量添加 ${groupList.length} 个群聊`)
  }

  /**
   * 内部方法：更新群聊信息（不包含API调用）
   *
   * 使用场景：
   * - Composable层更新群聊信息后同步本地状态
   * - 群聊名称、头像、简介等信息的更新
   * - 合并部分群聊信息
   *
   * @param {string} gid - 群聊ID
   * @param {Partial<Group>} updates - 更新的群聊信息
   */
  const _updateGroupInternal = (gid: string, updates: Partial<Group>) => {
    const existingGroup = groups.value.get(gid)
    if (existingGroup) {
      groups.value.set(gid, { ...existingGroup, ...updates })
      console.log(`groupStore: 更新群聊信息 ${gid}`)
    } else {
      console.warn(`groupStore: 尝试更新不存在的群聊 ${gid}`)
    }
  }

  /**
   * 内部方法：移除群聊（不包含API调用）
   *
   * 使用场景：
   * - Composable层解散群聊后清理本地状态
   * - 退出群聊后移除本地记录
   * - 数据同步时清理无效群聊
   *
   * @param {string} gid - 群聊ID
   */
  const _removeGroupInternal = (gid: string) => {
    const removed = groups.value.delete(gid)
    if (removed) {
      groupsVersion.value++ // 触发响应式更新
      // 清理相关缓存
      groupCards.value.delete(gid)
      groupProfiles.value.delete(gid)
      groupMembers.value.delete(gid)
      groupAnnouncements.value.delete(gid)
      console.log(`groupStore: 移除群聊 ${gid} 及相关数据`)
    } else {
      console.warn(`groupStore: 尝试移除不存在的群聊 ${gid}`)
    }
  }

  /**
   * 设置群聊列表（从API数据）
   *
   * 使用场景：
   * - Composable层获取群聊列表后更新Store
   * - 初始化群聊数据
   * - 刷新群聊列表
   *
   * @param {Group[]} groupList - 群聊列表
   */
  const setGroups = (groupList: Group[]) => {
    // 清空现有数据
    groups.value.clear()

    // 批量添加新数据
    _addGroupsInternal(groupList)

    // 更新最后获取时间
    lastFetchTime.value = Date.now()

    // 触发响应式更新
    groupsVersion.value++

    console.log(`groupStore: 设置群聊列表，共 ${groupList.length} 个群聊`)
  }

  /**
   * 设置群聊列表（从API响应数据）
   *
   * 使用场景：
   * - Composable层调用API后直接传入响应数据
   * - 数据格式转换和状态更新
   *
   * @param {GetGroupListResponse} apiResponse - API响应数据
   */
  const setGroupsFromApiResponse = (apiResponse: GetGroupListResponse) => {
    const groupList = transformGroupListFromApi(apiResponse)
    setGroups(groupList)
  }

  // ==================== 群聊名片和详细信息管理 ====================

  /**
   * 内部方法：设置群聊名片（不包含API调用）
   *
   * 使用场景：
   * - Composable层获取群聊名片后更新缓存
   * - 批量预加载群聊名片
   *
   * @param {GroupCard} card - 群聊名片
   */
  const _setGroupCardInternal = (card: GroupCard) => {
    groupCards.value.set(card.id, card)
    console.log(`groupStore: 缓存群聊名片 ${card.id}`)
  }

  /**
   * 内部方法：设置群聊详细信息（不包含API调用）
   *
   * 使用场景：
   * - Composable层获取群聊详细信息后更新缓存
   * - 用户查看群聊设置时缓存数据
   *
   * @param {GroupProfile} profile - 群聊详细信息
   */
  const _setGroupProfileInternal = (profile: GroupProfile) => {
    groupProfiles.value.set(profile.id, profile)
    // 同时更新群聊基本信息
    _updateGroupInternal(profile.id, transformGroupProfileToGroup(profile))
    console.log(`groupStore: 缓存群聊详细信息 ${profile.id}`)
  }

  // ==================== 群成员管理方法 ====================

  /**
   * 内部方法：添加群成员（不包含API调用）
   *
   * 使用场景：
   * - Composable层添加成员后更新本地状态
   * - 批量导入群成员
   *
   * @param {string} gid - 群聊ID
   * @param {GroupMember} member - 群成员信息
   */
  const _addGroupMemberInternal = (gid: string, member: GroupMember) => {
    const members = groupMembers.value.get(gid) || []
    // 检查是否已存在
    const existingIndex = members.findIndex(m => m.id === member.id)
    if (existingIndex === -1) {
      members.push(member) // 添加新成员
    } else {
      members[existingIndex] = member // 更新现有成员
    }
    groupMembers.value.set(gid, members)
    console.log(`groupStore: 添加/更新群成员 ${gid}:${member.id}`)
  }

  /**
   * 内部方法：移除群成员（不包含API调用）
   *
   * 使用场景：
   * - Composable层踢出成员后更新本地状态
   * - 成员主动退群后清理数据
   *
   * @param {string} gid - 群聊ID
   * @param {string} uid - 用户ID
   */
  const _removeGroupMemberInternal = (gid: string, uid: string) => {
    const members = groupMembers.value.get(gid) || []
    const filteredMembers = members.filter(m => m.id !== uid)
    groupMembers.value.set(gid, filteredMembers)
    console.log(`groupStore: 移除群成员 ${gid}:${uid}`)
  }

  /**
   * 内部方法：更新群成员信息（不包含API调用）
   *
   * 使用场景：
   * - Composable层修改成员角色后更新本地状态
   * - 成员更改群昵称等信息
   *
   * @param {string} gid - 群聊ID
   * @param {string} uid - 用户ID
   * @param {Partial<GroupMember>} updates - 更新的成员信息
   */
  const _updateGroupMemberInternal = (gid: string, uid: string, updates: Partial<GroupMember>) => {
    const members = groupMembers.value.get(gid) || []
    const memberIndex = members.findIndex(m => m.id === uid)
    if (memberIndex === -1) {
      console.warn(`groupStore: 尝试更新不存在的群成员 ${gid}:${uid}`)
    } else {
      members[memberIndex] = { ...members[memberIndex], ...updates } as GroupMember
      groupMembers.value.set(gid, members)
      console.log(`groupStore: 更新群成员信息 ${gid}:${uid}`)
    }
  }

  /**
   * 内部方法：批量更新群成员角色（不包含API调用）
   *
   * 使用场景：
   * - Composable层批量设置管理员后更新本地状态
   * - 批量角色权限调整
   *
   * @param {string} gid - 群聊ID
   * @param {string[]} uids - 用户ID数组
   * @param {GroupRole} role - 新角色
   */
  const _batchUpdateGroupMemberRoleInternal = (gid: string, uids: string[], role: GroupRole) => {
    const members = groupMembers.value.get(gid) || []
    for (const uid of uids) {
      const memberIndex = members.findIndex(m => m.id === uid)
      if (memberIndex !== -1) {
        const member = members[memberIndex]
        if (member) {
          member.role = role
        }
      }
    }
    groupMembers.value.set(gid, members)
    console.log(`groupStore: 批量更新群成员角色 ${gid}，${uids.length}个成员设为${role}`)
  }

  /**
   * 设置群成员列表（从API响应数据）
   *
   * 使用场景：
   * - Composable层获取群成员列表后更新Store
   * - 初始化群成员数据
   * - 刷新群成员列表
   *
   * @param {string} gid - 群聊ID
   * @param {GetGroupMembersResponse} apiResponse - API响应数据
   */
  const setGroupMembersFromApiResponse = (gid: string, apiResponse: GetGroupMembersResponse) => {
    const members = apiResponse.members.map(transformGroupMemberFromApi)
    groupMembers.value.set(gid, members)
    console.log(`groupStore: 设置群成员列表 ${gid}，共 ${members.length} 个成员`)
  }

  // ==================== 群公告管理方法 ====================

  /**
   * 内部方法：添加群公告（不包含API调用）
   *
   * 使用场景：
   * - Composable层发布公告后更新本地状态
   * - 批量导入历史公告
   *
   * @param {GroupAnnouncement} announcement - 群公告信息
   */
  const _addGroupAnnouncementInternal = (announcement: GroupAnnouncement) => {
    const announcements = groupAnnouncements.value.get(announcement.gid) || []
    // 检查是否已存在（通过msg_id）
    const existingIndex = announcements.findIndex(a => a.msg_id === announcement.msg_id)
    if (existingIndex === -1) {
      announcements.unshift(announcement) // 添加新公告到开头
    } else {
      announcements[existingIndex] = announcement // 更新现有公告
    }
    groupAnnouncements.value.set(announcement.gid, announcements)
    console.log(`groupStore: 添加/更新群公告 ${announcement.gid}:${announcement.msg_id}`)
  }

  /**
   * 设置群公告列表（从API响应数据）
   *
   * 使用场景：
   * - Composable层获取群公告列表后更新Store
   * - 初始化群公告数据
   * - 刷新群公告列表
   *
   * @param {string} gid - 群聊ID
   * @param {GetGroupAnnouncementsResponse} apiResponse - API响应数据
   */
  const setGroupAnnouncementsFromApiResponse = (gid: string, apiResponse: GetGroupAnnouncementsResponse) => {
    groupAnnouncements.value.set(gid, apiResponse.announcements)
    console.log(`groupStore: 设置群公告列表 ${gid}，共 ${apiResponse.announcements.length} 个公告`)
  }

  // ==================== 权限检查方法 ====================

  /**
   * 检查用户是否为群主
   *
   * 使用场景：
   * - 判断是否可以解散群聊
   * - 判断是否可以转让群主
   * - 判断是否可以设置管理员
   *
   * @param {string} gid - 群聊ID
   * @param {string} uid - 用户ID，默认为当前用户
   * @returns {boolean} 是否为群主
   */
  const isGroupOwner = (gid: string, uid: string): boolean => {
    // 检查群聊详细信息中的manager_uid
    const profile = groupProfiles.value.get(gid)
    if (profile?.manager_uid === uid) {
      return true
    }

    // 检查群成员列表中的角色
    const members = groupMembers.value.get(gid) || []
    const member = members.find(m => m.id === uid)
    return member?.role === GroupRole.OWNER
  }

  /**
   * 检查用户是否为群管理员
   *
   * 使用场景：
   * - 判断是否可以踢出成员
   * - 判断是否可以发布公告
   * - 判断是否可以编辑群信息
   *
   * @param {string} gid - 群聊ID
   * @param {string} uid - 用户ID，默认为当前用户
   * @returns {boolean} 是否为群管理员
   */
  const isGroupAdmin = (gid: string, uid: string): boolean => {
    // 群主也是管理员
    if (isGroupOwner(gid, uid)) {
      return true
    }

    // 检查群成员列表中的角色
    const members = groupMembers.value.get(gid) || []
    const member = members.find(m => m.id === uid)
    return member?.role === GroupRole.ADMIN
  }

  /**
   * 检查用户是否在群中
   *
   * 使用场景：
   * - 判断用户是否可以查看群内容
   * - 过滤用户所在的群聊列表
   * - 权限验证的基础检查
   *
   * @param {string} gid - 群聊ID
   * @param {string} uid - 用户ID
   * @returns {boolean} 是否在群中
   */
  const isInGroup = (gid: string, uid: string): boolean => {
    // 检查是否在群成员列表中
    const members = groupMembers.value.get(gid) || []
    return members.some(m => m.id === uid)
  }

  // ==================== 数据查询方法 ====================

  /**
   * 获取群聊信息
   *
   * 使用场景：
   * - 显示群聊基本信息
   * - 群聊列表项展示
   * - 权限验证前的存在性检查
   *
   * @param {string} gid - 群聊ID
   * @returns {Group | null} 群聊信息或null
   */
  const getGroupById = (gid: string): Group | null => {
    return groups.value.get(gid) || null
  }

  /**
   * 获取群聊名片
   *
   * 使用场景：
   * - 显示群聊详细信息
   * - 群聊设置页面展示
   * - 权限验证需要群主信息
   *
   * @param {string} gid - 群聊ID
   * @returns {GroupCard | null} 群聊名片或null
   */
  const getGroupCard = (gid: string): GroupCard | null => {
    return groupCards.value.get(gid) || null
  }

  /**
   * 获取群聊详细信息
   *
   * 使用场景：
   * - 显示完整群聊信息
   * - 群聊设置和成员管理
   * - 用户个人群聊配置
   *
   * @param {string} gid - 群聊ID
   * @returns {GroupProfile | null} 群聊详细信息或null
   */
  const getGroupProfile = (gid: string): GroupProfile | null => {
    return groupProfiles.value.get(gid) || null
  }

  /**
   * 获取群成员列表
   *
   * 使用场景：
   * - 显示群成员列表
   * - 成员管理和权限设置
   * - @提及功能的前端匹配
   *
   * @param {string} gid - 群聊ID
   * @returns {GroupMember[]} 群成员列表
   */
  const getGroupMembers = (gid: string): GroupMember[] => {
    return groupMembers.value.get(gid) || []
  }

  /**
   * 获取群成员信息
   *
   * 使用场景：
   * - 显示特定成员信息
   * - 权限验证
   * - 成员编辑操作
   *
   * @param {string} gid - 群聊ID
   * @param {string} uid - 用户ID
   * @returns {GroupMember | null} 群成员信息或null
   */
  const getGroupMemberByUid = (gid: string, uid: string): GroupMember | null => {
    const members = groupMembers.value.get(gid) || []
    return members.find(m => m.id === uid) || null
  }

  /**
   * 获取群公告列表
   *
   * 使用场景：
   * - 显示群公告列表
   * - 群聊公告管理
   * - 新消息提示
   *
   * @param {string} gid - 群聊ID
   * @returns {GroupAnnouncement[]} 群公告列表
   */
  const getGroupAnnouncements = (gid: string): GroupAnnouncement[] => {
    return groupAnnouncements.value.get(gid) || []
  }

  // ==================== 状态管理方法 ====================

  /**
   * 重置所有群聊数据
   *
   * 使用场景：
   * - 用户登出时清理数据
   * - 切换账号时清理旧数据
   * - 开发环境重置测试数据
   */
  const reset = () => {
    groups.value.clear()
    groupCards.value.clear()
    groupProfiles.value.clear()
    groupMembers.value.clear()
    groupAnnouncements.value.clear()
    isLoading.value = false
    lastFetchTime.value = 0
    groupsVersion.value = 0 // 重置版本号
    console.log('groupStore: 重置所有群聊数据')
  }

  // ==================== 返回接口 ====================
  return {
    // State
    groups,
    groupCards,
    groupProfiles,
    groupMembers,
    groupAnnouncements,
    isLoading,
    lastFetchTime,

    // Computed
    allGroups,
    groupCount,

    // 状态管理
    setLoading,
    reset,

    // 群聊管理（内部方法，供Composable调用）
    _addGroupInternal,
    _addGroupsInternal,
    _updateGroupInternal,
    _removeGroupInternal,
    setGroups,
    setGroupsFromApiResponse,

    // 群聊名片和详细信息（内部方法）
    _setGroupCardInternal,
    _setGroupProfileInternal,

    // 群成员管理（内部方法）
    _addGroupMemberInternal,
    _removeGroupMemberInternal,
    _updateGroupMemberInternal,
    _batchUpdateGroupMemberRoleInternal,
    setGroupMembersFromApiResponse,

    // 群公告管理（内部方法）
    _addGroupAnnouncementInternal,
    setGroupAnnouncementsFromApiResponse,

    // 权限检查
    isGroupOwner,
    isGroupAdmin,
    isInGroup,

    // 数据查询
    getGroupById,
    getGroupCard,
    getGroupProfile,
    getGroupMembers,
    getGroupMemberByUid,
    getGroupAnnouncements,
  }
})
