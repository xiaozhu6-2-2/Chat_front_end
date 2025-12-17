import type {
  CreateGroupParams,
  DisbandGroupParams,
  GetGroupAnnouncementsResponse,
  GetGroupMembersResponse,
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
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useSnackbar } from '@/composables/useSnackbar'
import { groupService } from '@/service/groupService'
import {
  GroupRole,
  transformGroupCardToGroup,
  transformGroupMemberFromApi,
  transformGroupProfileToGroup,
  transformGroupProfileToGroupCard,
} from '@/types/group'
import { useUserStore } from './userStore'

export const useGroupStore = defineStore('group', () => {
  // 初始化 snackbar
  const { showSuccess, showError, showWarning } = useSnackbar()

  // State
  const groups = ref<Map<string, Group>>(new Map()) // id(gid) -> group
  const groupCards = ref<Map<string, GroupCard>>(new Map()) // gid -> card (缓存)
  const groupProfiles = ref<Map<string, GroupProfile>>(new Map()) // gid -> profile (缓存)
  const groupMembers = ref<Map<string, GroupMember[]>>(new Map()) // gid -> members[]
  const groupAnnouncements = ref<Map<string, GroupAnnouncement[]>>(new Map()) // gid -> announcements[]
  const isLoading = ref(false)
  const lastFetchTime = ref<number>(0) // 上次获取群聊列表的时间

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
    return Array.from(groups.value.values())
      .sort((a, b) => b.id.localeCompare(a.id))
  })

  /**
   * 获取群聊总数
   *
   * 使用场景：
   * - 群聊列表页面显示数量
   * - 徽标或角标显示
   * - 数据统计展示
   *
   * @returns {number} 群聊总数
   */
  const groupCount = computed(() => groups.value.size)

  /**
   * 根据 ID 获取群聊信息
   *
   * 使用场景：
   * - 进入群聊页面时获取群聊信息
   * - 群聊设置页面展示基本信息
   * - 消息推送时获取群聊详情
   *
   * @returns {(gid: string) => Group | undefined} 根据 gid 获取群聊对象的函数
   */
  const getGroupById = computed(() => {
    return (gid: string) => groups.value.get(gid)
  })

  /**
   * 获取群聊名片缓存
   *
   * 使用场景：
   * - 搜索结果展示群聊基本信息
   * - 群聊邀请页面展示群聊卡片
   * - 群聊列表预览信息
   *
   * @returns {(gid: string) => GroupCard | undefined} 根据 gid 获取群聊名片的函数
   */
  const getGroupCard = computed(() => {
    return (gid: string) => groupCards.value.get(gid)
  })

  /**
   * 获取群聊详细信息缓存
   *
   * 使用场景：
   * - 群聊设置页面展示完整信息
   * - 获取群聊公告、成员等详细信息
   * - 用户在群聊中的个人信息展示
   *
   * @returns {(gid: string) => GroupProfile | undefined} 根据 gid 获取群聊详细信息的函数
   */
  const getGroupProfile = computed(() => {
    return (gid: string) => groupProfiles.value.get(gid)
  })

  /**
   * 获取群成员列表缓存
   *
   * 使用场景：
   * - 群成员页面展示成员列表
   * - @提及功能获取成员列表
   * - 权限验证时获取成员角色
   *
   * @returns {(gid: string) => GroupMember[]} 根据 gid 获取群成员列表的函数
   */
  const getGroupMembers = computed(() => {
    return (gid: string) => groupMembers.value.get(gid) || []
  })

  /**
   * 获取群公告列表缓存
   *
   * 使用场景：
   * - 群公告页面展示公告列表
   * - 群聊入口显示最新公告
   * - 公告管理和编辑功能
   *
   * @returns {(gid: string) => GroupAnnouncement[]} 根据 gid 获取群公告列表的函数
   */
  const getGroupAnnouncements = computed(() => {
    return (gid: string) => groupAnnouncements.value.get(gid) || []
  })

  /**
   * 获取群主信息
   *
   * 使用场景：
   * - 显示群主标识
   * - 权限验证时判断是否为群主
   * - 群主相关操作的权限检查
   *
   * @returns {(gid: string) => GroupMember | undefined} 根据 gid 获取群主成员对象的函数
   */
  const getGroupOwner = computed(() => {
    return (gid: string) => {
      const members = getGroupMembers.value(gid)
      return members.find(m => m.role === GroupRole.OWNER)
    }
  })

  /**
   * 获取群管理员列表
   *
   * 使用场景：
   * - 显示管理员标识
   * - 管理员权限验证
   * - 管理员相关功能的权限检查
   *
   * @returns {(gid: string) => GroupMember[]} 根据 gid 获取管理员成员列表的函数
   */
  const getGroupAdmins = computed(() => {
    return (gid: string) => {
      const members = getGroupMembers.value(gid)
      return members.filter(m => m.role === GroupRole.ADMIN)
    }
  })

  /**
   * 获取普通群成员列表
   *
   * 使用场景：
   * - 成员管理页面
   * - 批量操作普通成员
   * - 成员统计和展示
   *
   * @returns {(gid: string) => GroupMember[]} 根据 gid 获取普通成员列表的函数
   */
  const getOrdinaryMembers = computed(() => {
    return (gid: string) => {
      const members = getGroupMembers.value(gid)
      return members.filter(m => m.role === GroupRole.MEMBER)
    }
  })

  /**
   * 获取群成员总数
   *
   * 使用场景：
   * - 群聊信息页面显示成员数量
   * - 群聊列表显示成员统计
   * - 数据统计和展示
   *
   * @returns {(gid: string) => number} 根据 gid 获取群成员总数的函数
   */
  const getGroupMemberCount = computed(() => {
    return (gid: string) => getGroupMembers.value(gid).length
  })

  /**
   * 检查用户是否为群主
   *
   * 使用场景：
   * - 群主权限功能显示/隐藏
   * - 解散群聊、转让群主等操作权限
   * - 群主专属功能的访问控制
   *
   * @returns {(gid: string, uid: string) => boolean} 检查指定用户是否为群主的函数
   */
  const isGroupOwner = computed(() => {
    return (gid: string, uid: string) => {
      const member = getGroupMembers.value(gid).find(m => m.id === uid)
      return member?.role === GroupRole.OWNER
    }
  })

  /**
   * 检查用户是否为管理员（包含群主）
   *
   * 使用场景：
   * - 管理员权限功能显示/隐藏
   * - 踢出成员等操作权限
   * - 管理员专属功能的访问控制
   *
   * @returns {(gid: string, uid: string) => boolean} 检查指定用户是否为管理员或群主的函数
   */
  const isGroupAdmin = computed(() => {
    return (gid: string, uid: string) => {
      const member = getGroupMembers.value(gid).find(m => m.id === uid)
      return member?.role === GroupRole.ADMIN || member?.role === GroupRole.OWNER
    }
  })

  /**
   * 检查用户是否在群聊中
   *
   * 使用场景：
   * - 进入群聊前的权限验证
   * - 显示加入群聊按钮或进入群聊按钮
   * - 群聊相关功能的访问控制
   *
   * @returns {(gid: string, uid: string) => boolean} 检查指定用户是否在群聊中的函数
   */
  const isInGroup = computed(() => {
    return (gid: string, uid: string) => {
      return getGroupMembers.value(gid).some(m => m.id === uid)
    }
  })

  /**
   * 获取用户在指定群中的角色
   *
   * 执行流程：
   * 1. 获取指定群的成员列表
   * 2. 查找当前用户在群中的信息
   * 3. 返回用户角色，如果不是成员返回 null
   *
   * 使用场景：
   * - 群申请权限验证
   * - UI 权限控制
   * - 获取用户在群中的具体角色信息
   *
   * @param {string} gid - 群聊ID
   * @param {string} uid - 用户ID，默认为当前用户
   * @returns {GroupRole | null} 用户角色，如果不是成员返回 null
   */
  const getUserRoleInGroup = (gid: string, uid?: string): GroupRole | null => {
    const userId = uid || useUserStore().currentUserId
    if (!userId) return null

    const member = getGroupMembers.value(gid).find(m => m.id === userId)
    return member?.role || null
  }

  /**
   * 获取用户管理的群聊列表
   *
   * 执行流程：
   * 1. 遍历所有群聊
   * 2. 检查用户在每个群中的角色
   * 3. 过滤出用户有管理权限的群聊（群主或管理员）
   * 4. 返回群聊基本信息列表
   *
   * 使用场景：
   * - 显示用户可以管理群聊申请的群列表
   * - 群申请页面的群选择器
   * - 权限相关的群聊筛选
   *
   * @param {string} uid - 用户ID，默认为当前用户
   * @returns {Group[]} 用户有管理权限的群聊列表
   */
  const getManagedGroups = (uid?: string): Group[] => {
    const userId = uid || useUserStore().currentUserId
    if (!userId) return []

    return allGroups.value.filter(group => {
      const role = getUserRoleInGroup(group.id, userId)
      return role === GroupRole.OWNER || role === GroupRole.ADMIN
    })
  }

  // Actions
  /**
   * 设置加载状态
   *
   * 使用场景：
   * - API 请求开始时设置为 true
   * - API 请求结束时设置为 false
   *
   * @param {boolean} loading - 加载状态值
   */
  const setLoading = (loading: boolean) => {
    isLoading.value = loading
  }

  /**
   * 设置群聊列表
   *
   * 使用场景：
   * - 从服务器获取群聊列表后更新本地状态
   * - 初始化或刷新群聊数据
   *
   * @param {Group[]} groupList - 群聊列表数组
   */
  const setGroups = (groupList: Group[]) => {
    groups.value.clear()
    for (const group of groupList) {
      groups.value.set(group.id, group)
    }
    lastFetchTime.value = Date.now()
    console.log(`groupStore: 设置群聊列表，共 ${groupList.length} 个群聊`)
  }

  /**
   * 添加群聊
   *
   * 使用场景：
   * - 创建新群聊后添加到列表
   * - 加入新群聊后添加到本地状态
   *
   * @param {Group} group - 要添加的群聊对象
   */
  const addGroup = (group: Group) => {
    groups.value.set(group.id, group)
    console.log(`groupStore: 添加群聊`, group)
  }

  /**
   * 更新群聊信息
   *
   * 使用场景：
   * - 群聊名称、头像、简介等基本信息修改
   * - 群聊设置变更后的本地状态更新
   *
   * @param {string} gid - 群聊 ID
   * @param {Partial<Group>} updates - 要更新的群聊信息部分字段
   */
  const updateGroup = (gid: string, updates: Partial<Group>) => {
    const group = groups.value.get(gid)
    if (group) {
      const updatedGroup = { ...group, ...updates }
      groups.value.set(gid, updatedGroup)
      console.log(`groupStore: 更新群聊信息`, { gid, updates })
    }
  }

  /**
   * 更新群主信息
   *
   * 使用场景：
   * - 转让群主后更新群主ID
   * - WebSocket 推送群主变更
   *
   * @param {string} gid - 群聊 ID
   * @param {string} managerUid - 新群主的用户 ID
   */
  const updateGroupManager = (gid: string, managerUid: string) => {
    // 更新 groupCards 缓存
    const groupCard = groupCards.value.get(gid)
    if (groupCard) {
      const updatedCard = { ...groupCard, manager_uid: managerUid }
      setGroupCard(updatedCard) // 这会同时更新 groups 缓存
    }

    // 更新 groupProfiles 缓存
    const groupProfile = groupProfiles.value.get(gid)
    if (groupProfile) {
      const updatedProfile = { ...groupProfile, manager_uid: managerUid }
      setGroupProfile(updatedProfile) // 这会同时更新 groups 和 groupCards 缓存
    }

    console.log(`groupStore: 更新群主信息`, { gid, managerUid })
  }

  /**
   * 删除群聊
   *
   * 使用场景：
   * - 退出群聊后清理本地数据
   * - 解散群聊后移除相关缓存
   * - 踢出群聊后清理数据
   *
   * @param {string} gid - 群聊 ID
   * @returns {boolean} 是否成功删除
   */
  const removeGroup = (gid: string) => {
    const deleted = groups.value.delete(gid)
    if (deleted) {
      groupCards.value.delete(gid)
      groupProfiles.value.delete(gid)
      groupMembers.value.delete(gid)
      groupAnnouncements.value.delete(gid)
      console.log(`groupStore: 删除群聊`, gid)
    }
    return deleted
  }

  // GroupCard 缓存管理
  /**
   * 缓存群聊名片
   *
   * 使用场景：
   * - 从 API 获取群聊名片后进行缓存
   * - WebSocket 推送群聊信息更新
   * - 搜索群聊结果缓存
   *
   * @param {GroupCard} card - 群聊名片对象
   */
  const setGroupCard = (card: GroupCard) => {
    groupCards.value.set(card.id, card)
    // 同时更新基本信息到 groups
    const basicGroup = transformGroupCardToGroup(card)
    if (!groups.value.has(card.id)) {
      groups.value.set(card.id, basicGroup)
    }
    console.log(`groupStore: 缓存群聊名片`, { gid: card.id, card })
  }

  /**
   * 获取或请求群聊名片
   *
   * 使用场景：
   * - 查看群聊资料页面
   * - 搜索群聊结果展示
   * - 群聊信息预览
   *
   * @param {string} gid - 群聊 ID
   * @returns {Promise<GroupCard>} 群聊名片对象
   */
  const getOrFetchGroupCard = async (gid: string): Promise<GroupCard> => {
    // 先检查缓存
    let card = groupCards.value.get(gid)
    if (card) {
      return card
    }

    // 缓存没有，从 API 获取
    try {
      card = await groupService.getGroupCard({ gid })
      setGroupCard(card)
      return card
    } catch (error) {
      console.error('groupStore: 获取群聊名片失败', { gid }, error)
      throw error
    }
  }

  // GroupProfile 缓存管理
  /**
   * 缓存群聊详细信息
   *
   * 使用场景：
   * - 进入群聊设置页面时缓存详细信息
   * - 群聊设置更新后更新缓存
   * - 获取用户在群聊中的个人信息
   *
   * @param {GroupProfile} profile - 群聊详细信息对象
   */
  const setGroupProfile = (profile: GroupProfile) => {
    groupProfiles.value.set(profile.id, profile)
    // 同时更新基本信息到 groups
    const basicGroup = transformGroupProfileToGroup(profile)
    groups.value.set(profile.id, basicGroup)
    // 更新groupCards缓存
    const groupCard = transformGroupProfileToGroupCard(profile)
    groupCards.value.set(profile.id, groupCard)
    console.log(`groupStore: 缓存群聊详细信息`, { gid: profile.id, profile })
  }

  /**
   * 获取或请求群聊详细信息
   *
   * 使用场景：
   * - 进入群聊设置页面
   * - 查看用户在群聊中的详细资料
   * - 刷新群聊详细信息
   *
   * @param {string} gid - 群聊 ID
   * @param {boolean} [forceRefresh=false] - 是否强制刷新缓存
   * @returns {Promise<GroupProfile>} 群聊详细信息对象
   */
  const getOrFetchGroupProfile = async (gid: string, forceRefresh = false): Promise<GroupProfile> => {
    // 检查缓存
    if (!forceRefresh && groupProfiles.value.has(gid)) {
      return groupProfiles.value.get(gid)!
    }

    // 从 API 获取
    try {
      const profile = await groupService.getGroupProfile({ gid })
      setGroupProfile(profile)
      return profile
    } catch (error) {
      console.error('groupStore: 获取群聊详细信息失败', { gid }, error)
      throw error
    }
  }

  // 成员管理
  /**
   * 设置群成员列表
   *
   * 使用场景：
   * - 从服务器获取群成员列表后更新本地状态
   * - 初始化或刷新群成员数据
   *
   * @param {string} gid - 群聊 ID
   * @param {GroupMember[]} members - 群成员列表数组
   */
  const setGroupMembers = (gid: string, members: GroupMember[]) => {
    groupMembers.value.set(gid, members)
    console.log(`groupStore: 设置群成员列表，群 ${gid}，共 ${members.length} 个成员`)
  }

  /**
   * 添加或更新群成员
   *
   * 使用场景：
   * - 新成员加入群聊
   * - 群成员信息更新（角色变更、昵称修改等）
   * - WebSocket 推送成员信息变更
   *
   * @param {string} gid - 群聊 ID
   * @param {GroupMember} member - 群成员对象
   */
  const addGroupMember = (gid: string, member: GroupMember) => {
    const members = groupMembers.value.get(gid) || []
    const existingIndex = members.findIndex(m => m.id === member.id)

    if (existingIndex === -1) {
      // 添加新成员
      members.push(member)
    } else {
      // 更新现有成员
      members[existingIndex] = member
    }

    groupMembers.value.set(gid, members)
    console.log(`groupStore: 添加/更新群成员`, { gid, member })
  }

  /**
   * 移除群成员
   *
   * 使用场景：
   * - 成员主动退出群聊
   * - 管理员踢出群成员
   * - 成员被解散群聊时清理数据
   *
   * @param {string} gid - 群聊 ID
   * @param {string} uid - 要移除的成员用户 ID
   */
  const removeGroupMember = (gid: string, uid: string) => {
    const members = groupMembers.value.get(gid) || []
    const index = members.findIndex(m => m.id === uid)
    if (index !== -1) {
      members.splice(index, 1)
      groupMembers.value.set(gid, members)
      console.log(`groupStore: 移除群成员`, { gid, uid })
    }
  }

  /**
   * 更新群成员信息
   *
   * 使用场景：
   * - 成员角色变更（设置为管理员）
   * - 成员昵称、备注等信息更新
   *
   * @param {string} gid - 群聊 ID
   * @param {string} uid - 成员用户 ID
   * @param {Partial<GroupMember>} updates - 要更新的成员信息部分字段
   */
  const updateGroupMember = (gid: string, uid: string, updates: Partial<GroupMember>) => {
    const members = groupMembers.value.get(gid) || []
    const index = members.findIndex(m => m.id === uid)
    if (index !== -1) {
      members[index] = { ...members[index], ...updates } as GroupMember
      groupMembers.value.set(gid, members)
      console.log(`groupStore: 更新群成员信息`, { gid, uid, updates })
    }
  }

  /**
   * 批量更新群成员角色
   *
   * 使用场景：
   * - 群主转让后更新双方角色
   * - 批量设置或取消管理员权限
   * - 批量成员角色调整
   *
   * @param {string} gid - 群聊 ID
   * @param {{ uid: string; role: GroupRole }[]} updates - 要更新的角色信息数组
   */
  const batchUpdateGroupMemberRole = (gid: string, updates: { uid: string, role: GroupRole }[]) => {
    const members = groupMembers.value.get(gid) || []
    for (const { uid, role } of updates) {
      const index = members.findIndex(m => m.id === uid)
      if (index !== -1) {
        (members[index] as any).role = role
      }
    }
    groupMembers.value.set(gid, members)
    console.log(`groupStore: 批量更新群成员角色`, { gid, updates })
  }

  /**
   * 批量移除群成员
   *
   * 使用场景：
   * - 解散群聊时移除所有成员
   * - 批量踢出多个违规成员
   * - 清理已退出或被踢的成员数据
   *
   * @param {string} gid - 群聊 ID
   * @param {string[]} uids - 要移除的成员用户 ID 数组
   */
  const batchRemoveGroupMembers = (gid: string, uids: string[]) => {
    const members = groupMembers.value.get(gid) || []
    const filteredMembers = members.filter(m => !uids.includes(m.id))
    groupMembers.value.set(gid, filteredMembers)
    console.log(`groupStore: 批量移除群成员`, { gid, uids })
  }

  // 公告管理
  /**
   * 设置群公告列表
   *
   * 使用场景：
   * - 从服务器获取群公告列表后更新本地状态
   * - 初始化或刷新群公告数据
   *
   * @param {string} gid - 群聊 ID
   * @param {GroupAnnouncement[]} announcements - 群公告列表数组
   */
  const setGroupAnnouncements = (gid: string, announcements: GroupAnnouncement[]) => {
    groupAnnouncements.value.set(gid, announcements)
    console.log(`groupStore: 设置群公告列表`, { gid, count: announcements.length })
  }

  /**
   * 添加或更新群公告
   *
   * 使用场景：
   * - 发布新群公告
   * - 编辑现有群公告
   * - WebSocket 推送公告更新
   *
   * @param {string} gid - 群聊 ID
   * @param {GroupAnnouncement} announcement - 群公告对象
   */
  const addGroupAnnouncement = (gid: string, announcement: GroupAnnouncement) => {
    const announcements = groupAnnouncements.value.get(gid) || []
    const existingIndex = announcements.findIndex(a => a.msg_id === announcement.msg_id)

    if (existingIndex === -1) {
      announcements.unshift(announcement) // 新公告放在前面
    } else {
      announcements[existingIndex] = announcement
    }

    groupAnnouncements.value.set(gid, announcements)
  }

  /**
   * 重置所有群聊状态
   *
   * 使用场景：
   * - 用户退出登录时清理数据
   * - 切换账号时重置状态
   * - 调试或测试时清理缓存
   */
  const reset = () => {
    groups.value.clear()
    groupCards.value.clear()
    groupProfiles.value.clear()
    groupMembers.value.clear()
    groupAnnouncements.value.clear()
    isLoading.value = false
    lastFetchTime.value = 0
    console.log('groupStore: 重置所有状态')
  }

  // API 调用方法
  /**
   * 获取群聊列表
   *
   * 使用场景：
   * - 进入群聊界面时加载群聊列表
   * - 下拉刷新群聊列表
   * - 定期同步群聊数据
   *
   * @param {boolean} [forceRefresh=false] - 是否强制刷新缓存
   * @returns {Promise<Group[]>} 群聊列表数组
   */
  const fetchGroups = async (forceRefresh = false): Promise<Group[]> => {
    // 如果不需要强制刷新且已经有数据，直接返回
    if (!forceRefresh && groups.value.size > 0) {
      return allGroups.value
    }

    setLoading(true)
    try {
      const groupList = await groupService.getGroupList()
      setGroups(groupList)
      return groupList
    } catch (error) {
      console.error('groupStore: 获取群聊列表失败', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  /**
   * 获取群成员列表
   *
   * 使用场景：
   * - 进入群成员页面时加载成员列表
   * - 刷新群成员信息
   * - 获取管理员权限验证所需的成员信息
   *
   * @param {string} gid - 群聊 ID
   * @param {boolean} [forceRefresh=false] - 是否强制刷新缓存
   * @returns {Promise<GroupMember[]>} 群成员列表数组
   */
  const fetchGroupMembers = async (gid: string, forceRefresh = false): Promise<GroupMember[]> => {
    if (!forceRefresh && groupMembers.value.has(gid)) {
      return getGroupMembers.value(gid)
    }

    try {
      const response: GetGroupMembersResponse = await groupService.getGroupMembers({ gid })
      const members = response.members.map(transformGroupMemberFromApi)
      setGroupMembers(gid, members)
      return members
    } catch (error) {
      console.error('groupStore: 获取群成员失败', { gid }, error)
      throw error
    }
  }

  /**
   * 获取群公告列表
   *
   * 使用场景：
   * - 进入群公告页面时加载公告列表
   * - 刷新群公告信息
   * - 群公告推送后的数据同步
   *
   * @param {string} gid - 群聊 ID
   * @param {boolean} [forceRefresh=false] - 是否强制刷新缓存
   * @returns {Promise<GroupAnnouncement[]>} 群公告列表数组
   */
  const fetchGroupAnnouncements = async (gid: string, forceRefresh = false): Promise<GroupAnnouncement[]> => {
    if (!forceRefresh && groupAnnouncements.value.has(gid)) {
      return getGroupAnnouncements.value(gid)
    }

    try {
      const response: GetGroupAnnouncementsResponse = await groupService.getGroupAnnouncements({ gid })
      setGroupAnnouncements(gid, response.announcements)
      return response.announcements
    } catch (error) {
      console.error('groupStore: 获取群公告失败', { gid }, error)
      throw error
    }
  }

  // 工具方法
  /**
   * 根据 UID 获取群成员信息
   *
   * 使用场景：
   * - 获取特定成员的详细信息
   * - 验证用户是否在群聊中
   * - 获取成员角色等权限信息
   *
   * @param {string} gid - 群聊 ID
   * @param {string} uid - 用户 ID
   * @returns {GroupMember | undefined} 群成员对象，如果不存在则返回 undefined
   */
  const getGroupMemberByUid = (gid: string, uid: string): GroupMember | undefined => {
    const members = getGroupMembers.value(gid)
    return members.find(m => m.id === uid)
  }

  // 组件直接调用的 API 方法（带 snackbar 反馈）

  /**
   * 创建群聊（组件直接调用）
   *
   * 使用场景：
   * - 用户在创建群聊页面点击创建按钮
   * - 系统需要创建默认群聊
   *
   * @param {CreateGroupParams} params - 创建群聊的参数
   * @returns {Promise<Group>} 创建成功的群聊对象
   */
  const createGroup = async (params: CreateGroupParams): Promise<Group> => {
    setLoading(true)
    try {
      const group = await groupService.createGroup(params)
      addGroup(group)
      showSuccess('群聊创建成功')
      return group
    } catch (error: any) {
      console.error('groupStore: 创建群聊失败', error)
      showError(error.message || '创建群聊失败，请重试')
      throw error
    } finally {
      setLoading(false)
    }
  }

  /**
   * 更新群信息（组件直接调用）
   *
   * 使用场景：
   * - 管理员在群设置页面修改群信息
   * - 群主更新群名称、头像或简介
   *
   * @param {SetGroupInfoParams} params - 更新群信息的参数
   * @returns {Promise<void>}
   */
  const updateGroupInfo = async (params: SetGroupInfoParams): Promise<void> => {
    setLoading(true)
    try {
      await groupService.setGroupInfo(params)
      // 更新本地缓存的群信息
      updateGroup(params.gid, {
        name: params.group_name,
        avatar: params.group_avatar,
        group_intro: params.group_intro,
      })
      showSuccess('群信息更新成功')
    } catch (error: any) {
      console.error('groupStore: 更新群信息失败', error)
      showError(error.message || '更新群信息失败，请重试')
      throw error
    } finally {
      setLoading(false)
    }
  }

  /**
   * 退出群聊（组件直接调用）
   *
   * 使用场景：
   * - 普通成员在群设置页面点击退出群聊
   * - 用户确认要退出群聊
   *
   * @param {LeaveGroupParams} params - 退出群聊的参数
   * @returns {Promise<void>}
   */
  const leaveGroup = async (params: LeaveGroupParams): Promise<void> => {
    setLoading(true)
    try {
      await groupService.leaveGroup(params)
      // 从本地状态中移除该群聊
      removeGroup(params.gid)
      showSuccess('已退出群聊')
    } catch (error: any) {
      console.error('groupStore: 退出群聊失败', error)
      showError(error.message || '退出群聊失败，请重试')
      throw error
    } finally {
      setLoading(false)
    }
  }

  /**
   * 踢出群成员（组件直接调用）
   *
   * 使用场景：
   * - 管理员在群成员页面踢出违规成员
   * - 群主清理不活跃成员
   *
   * @param {KickMemberParams} params - 踢出成员的参数
   * @returns {Promise<void>}
   */
  const kickMember = async (params: KickMemberParams): Promise<void> => {
    setLoading(true)
    try {
      await groupService.kickMember(params)
      // 从本地成员列表中移除该成员
      removeGroupMember(params.gid, params.uid)
      showSuccess('成员已被踢出')
    } catch (error: any) {
      console.error('groupStore: 踢出成员失败', error)
      showError(error.message || '踢出成员失败，请重试')
      throw error
    } finally {
      setLoading(false)
    }
  }

  /**
   * 解散群聊（组件直接调用）
   *
   * 使用场景：
   * - 群主在群设置页面点击解散群聊
   * - 群主确认要解散群聊
   *
   * @param {DisbandGroupParams} params - 解散群聊的参数
   * @returns {Promise<void>}
   */
  const disbandGroup = async (params: DisbandGroupParams): Promise<void> => {
    setLoading(true)
    try {
      await groupService.disbandGroup(params)
      // 从本地状态中移除该群聊
      removeGroup(params.gid)
      showSuccess('群聊已解散')
    } catch (error: any) {
      console.error('groupStore: 解散群聊失败', error)
      showError(error.message || '解散群聊失败，请重试')
      throw error
    } finally {
      setLoading(false)
    }
  }

  /**
   * 转让群主（组件直接调用）
   *
   * 使用场景：
   * - 群主在群成员页面转让群主权限
   * - 群主退出前转让权限
   *
   * @param {TransferOwnershipParams} params - 转让群主的参数
   * @returns {Promise<void>}
   */
  const transferGroupOwnership = async (params: TransferOwnershipParams): Promise<void> => {
    setLoading(true)
    try {
      await groupService.transferOwnership(params)
      // 获取当前用户信息
      const userStore = useUserStore()
      const currentUserId = userStore.currentUserId
      if (!currentUserId) {
        throw new Error('无法获取当前用户信息')
      }
      // 更新本地成员角色
      batchUpdateGroupMemberRole(params.gid, [
        { uid: params.uid, role: GroupRole.OWNER },
        { uid: currentUserId, role: GroupRole.MEMBER },
      ])
      // 更新群主信息
      updateGroupManager(params.gid, params.uid)
      showSuccess('群主转让成功')
    } catch (error: any) {
      console.error('groupStore: 转让群主失败', error)
      showError(error.message || '转让群主失败，请重试')
      throw error
    } finally {
      setLoading(false)
    }
  }

  /**
   * 设置/取消管理员（组件直接调用）
   *
   * 使用场景：
   * - 群主在群成员页面设置管理员
   * - 群主取消管理员权限
   *
   * 存在问题：没有取消的API/字段
   *
   * @param {SetAdminParams} params - 设置管理员的参数
   * @param {boolean} isSetAdmin - true表示设置管理员，false表示取消管理员
   * @returns {Promise<void>}
   */
  const setGroupAdmin = async (params: SetAdminParams, isSetAdmin = true): Promise<void> => {
    setLoading(true)
    try {
      await groupService.setAdmin(params)
      // 更新本地成员角色
      const newRole = isSetAdmin ? GroupRole.ADMIN : GroupRole.MEMBER
      updateGroupMember(params.gid, params.uid, { role: newRole })
      showSuccess(isSetAdmin ? '已设置管理员' : '已取消管理员权限')
    } catch (error: any) {
      console.error('groupStore: 设置管理员失败', error)
      showError(error.message || '设置管理员失败，请重试')
      throw error
    } finally {
      setLoading(false)
    }
  }

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
    getGroupById,
    getGroupCard,
    getGroupProfile,
    getGroupMembers,
    getGroupAnnouncements,
    getGroupOwner,
    getGroupAdmins,
    getOrdinaryMembers,
    getGroupMemberCount,
    isGroupOwner,
    isGroupAdmin,
    isInGroup,

    // Actions
    setLoading,
    setGroups,
    addGroup,
    updateGroup,
    removeGroup,
    updateGroupManager,

    // GroupCard 缓存
    setGroupCard,
    getOrFetchGroupCard,

    // GroupProfile 缓存
    setGroupProfile,
    getOrFetchGroupProfile,

    // 成员管理
    setGroupMembers,
    addGroupMember,
    removeGroupMember,
    updateGroupMember,
    batchUpdateGroupMemberRole,
    batchRemoveGroupMembers,

    // 公告管理
    setGroupAnnouncements,
    addGroupAnnouncement,

    reset,

    // API 调用方法
    fetchGroups,
    fetchGroupMembers,
    fetchGroupAnnouncements,

    // 组件直接调用的 API 方法（带 snackbar 反馈）
    createGroup,
    updateGroupInfo,
    leaveGroup,
    kickMember,
    disbandGroup,
    transferGroupOwnership,
    setGroupAdmin,

    // 工具方法
    getGroupMemberByUid,
    getUserRoleInGroup,
    getManagedGroups,
  }
})
