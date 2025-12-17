/**
 * 群聊服务层 - 处理群聊相关业务
 * 负责群聊管理的所有API调用
 */

import type {
  CreateGroupParams,
  CreateGroupResponse,
  DisbandGroupParams,
  GetGroupAnnouncementsParams,
  GetGroupAnnouncementsResponse,
  GetGroupCardParams,
  GetGroupListResponse,
  GetGroupMembersParams,
  GetGroupMembersResponse,
  GetGroupProfileParams,
  Group,
  GroupCard,
  GroupCardResponse,
  GroupProfile,
  GroupProfileResponse,
  KickMemberParams,
  LeaveGroupParams,
  SetAdminParams,
  SetGroupInfoParams,
  SetMemberParams,
  TransferOwnershipParams,
} from '@/types/group'
import {
  transformCreateGroupFromApi,
  transformGroupCardFromAPI,
  transformGroupListFromApi,
  transformGroupProfileFromAPI,
} from '@/types/group'
import { authApi } from './api'

export const groupService = {
  /**
   * 创建群聊
   *
   * 执行流程：
   * 1. 构建请求参数，确保所有字段都包含
   * 2. 发送 POST 请求到 /api/groups/create
   * 3. 转换响应数据为前端使用的 Group 对象
   * 4. 记录操作日志
   *
   * 数据流：
   * - 输入：CreateGroupParams（群名、头像、简介等）
   * - 输出：完整的 Group 对象
   * - 副作用：在 console 记录操作日志
   *
   * 使用场景：
   * - 用户创建新的群聊
   * - 系统自动创建默认群聊
   *
   * @param {CreateGroupParams} params - 创建群聊的参数
   * @returns {Promise<Group>} 创建成功的群聊对象
   * @throws {Error} 创建失败时抛出错误
   */
  async createGroup (params: CreateGroupParams): Promise<Group> {
    try {
      // 确保所有字段都包含，undefined 字段设置为 null
      const requestParams = {
        group_name: params.group_name || null,
        avatar: params.avatar || null,
        group_intro: params.group_intro || null,
      }

      console.log('groupService: 创建群聊', requestParams)
      const response = await authApi.post<CreateGroupResponse>('/groups/create', requestParams)

      if (response.status === 200) {
        const group = transformCreateGroupFromApi(response.data, params)
        console.log('groupService: 创建群聊成功', group)
        return group
      } else {
        throw new Error(`创建群聊失败：${response.status}`)
      }
    } catch (error) {
      console.error('groupService: 创建群聊失败', error)
      throw error
    }
  },

  /**
   * 获取群聊名片
   *
   * 执行流程：
   * 1. 构建请求参数，确保包含群 ID
   * 2. 发送 POST 请求到 /api/groups/card
   * 3. 返回群聊名片数据（基本信息）
   * 4. 记录操作日志
   *
   * 数据流：
   * - 输入：GetGroupCardParams（群 ID）
   * - 输出：GroupCard（群聊基本信息）
   * - 副作用：在 console 记录操作日志
   *
   * 使用场景：
   * - 用户点击群聊头像查看资料
   * - 搜索结果中显示群聊信息
   * - 群聊列表的详细信息展示
   *
   * @param {GetGroupCardParams} params - 获取群聊名片的参数
   * @returns {Promise<GroupCard>} 群聊名片对象
   * @throws {Error} 获取失败时抛出错误
   */
  async getGroupCard (params: GetGroupCardParams): Promise<GroupCard> {
    try {
      // 确保所有字段都包含
      const requestParams = {
        gid: params.gid || null,
      }

      console.log('groupService: 获取群聊名片', requestParams)
      const response = await authApi.post<GroupCardResponse>('/groups/card', requestParams)

      if (response.status === 200) {
        console.log('groupService: 获取群聊名片成功', response.data)
        // 转换 API 响应为内部格式
        return transformGroupCardFromAPI(response.data)
      } else {
        throw new Error(`获取群聊名片失败：${response.status}`)
      }
    } catch (error) {
      console.error('groupService: 获取群聊名片失败', error)
      throw error
    }
  },

  /**
   * 获取群聊详细信息
   *
   * 执行流程：
   * 1. 构建请求参数，确保包含群 ID
   * 2. 发送 POST 请求到 /api/groups/profile
   * 3. 返回群聊详细信息，包含群信息和用户在群中的个人信息
   * 4. 记录操作日志
   *
   * 数据流：
   * - 输入：GetGroupProfileParams（群 ID）
   * - 输出：GroupProfile（群信息和用户个人信息）
   * - 副作用：在 console 记录操作日志
   *
   * 使用场景：
   * - 用户进入群聊设置页面
   * - 查看用户在群聊中的详细资料（昵称、角色、加入时间等）
   * - 获取群聊的管理权限信息
   *
   * @param {GetGroupProfileParams} params - 获取群聊详细信息的参数
   * @returns {Promise<GroupProfile>} 群聊详细信息对象
   * @throws {Error} 获取失败时抛出错误
   */
  async getGroupProfile (params: GetGroupProfileParams): Promise<GroupProfile> {
    try {
      // 确保所有字段都包含
      const requestParams = {
        gid: params.gid || null,
      }

      console.log('groupService: 获取群聊信息', requestParams)
      const response = await authApi.post<GroupProfileResponse>('/groups/profile', requestParams)

      if (response.status === 200) {
        console.log('groupService: 获取群聊信息成功', response.data)
        // 转换 API 响应为内部格式
        return transformGroupProfileFromAPI(response.data)
      } else {
        throw new Error(`获取群聊信息失败：${response.status}`)
      }
    } catch (error) {
      console.error('groupService: 获取群聊信息失败', error)
      throw error
    }
  },

  /**
   * 获取群聊列表
   *
   * 执行流程：
   * 1. 发送 GET 请求到 /api/groups/grouplist（无需参数）
   * 2. 使用 transformGroupListFromApi 转换 API 响应为前端 Group 对象数组
   * 3. 记录操作日志，包含群聊数量
   * 4. 返回群聊列表
   *
   * 数据流：
   * - 输入：无
   * - 输出：Group[]（用户加入的所有群聊列表）
   * - 副作用：在 console 记录操作日志
   *
   * 使用场景：
   * - 用户进入群聊界面时加载群聊列表
   * - 下拉刷新群聊列表
   * - 应用启动时初始化群聊数据
   *
   * @returns {Promise<Group[]>} 用户加入的所有群聊列表
   * @throws {Error} 获取失败时抛出错误
   */
  async getGroupList (): Promise<Group[]> {
    try {
      console.log('groupService: 获取群聊列表')
      const response = await authApi.get<GetGroupListResponse>('/groups/grouplist')

      if (response.status === 200) {
        const groups = transformGroupListFromApi(response.data)
        console.log(`groupService: 获取群聊列表成功，共 ${groups.length} 个群聊`)
        return groups
      } else {
        throw new Error(`获取群聊列表失败：${response.status}`)
      }
    } catch (error) {
      console.error('groupService: 获取群聊列表失败', error)
      throw error
    }
  },

  /**
   * 退出群聊
   *
   * 执行流程：
   * 1. 构建请求参数，确保包含群 ID
   * 2. 发送 POST 请求到 /api/groups/leave
   * 3. 记录退出结果
   * 4. 注意：如果当前用户是群主，服务器会返回错误
   *
   * 数据流：
   * - 输入：LeaveGroupParams（群 ID）
   * - 输出：无
   * - 副作用：在 console 记录操作日志，用户退出群聊
   *
   * 使用场景：
   * - 普通成员主动退出群聊
   * - 管理员退出群聊（不能是群主）
   *
   * @param {LeaveGroupParams} params - 退出群聊的参数
   * @returns {Promise<void>} 无返回值
   * @throws {Error} 退出失败时抛出错误
   */
  async leaveGroup (params: LeaveGroupParams): Promise<void> {
    try {
      // 确保所有字段都包含
      const requestParams = {
        gid: params.gid || null,
      }

      console.log('groupService: 退出群聊', requestParams)
      const response = await authApi.post('/groups/leave', requestParams)

      if (response.status === 200) {
        console.log('groupService: 退出群聊成功')
      } else {
        throw new Error(`退出群聊失败：${response.status}`)
      }
    } catch (error) {
      console.error('groupService: 退出群聊失败', error)
      throw error
    }
  },

  /**
   * 踢出群成员
   *
   * 执行流程：
   * 1. 构建请求参数，包含群 ID 和成员 ID
   * 2. 发送 POST 请求到 /api/groups/kick_member
   * 3. 记录踢出结果
   *
   * 数据流：
   * - 输入：KickMemberParams（群 ID、成员 ID）
   * - 输出：无
   * - 副作用：在 console 记录操作日志，成员被踢出群聊
   *
   * 使用场景：
   * - 群主或管理员踢出违规成员
   * - 清理不活跃成员
   *
   * @param {KickMemberParams} params - 踢出成员的参数
   * @returns {Promise<void>} 无返回值
   * @throws {Error} 踢出失败时抛出错误
   */
  async kickMember (params: KickMemberParams): Promise<void> {
    try {
      // 确保所有字段都包含
      const requestParams = {
        gid: params.gid || null,
        uid: params.uid || null,
      }

      console.log('groupService: 踢出成员', requestParams)
      const response = await authApi.post('/groups/kick_member', requestParams)

      if (response.status === 200) {
        console.log('groupService: 踢出成员成功')
      } else {
        throw new Error(`踢出成员失败：${response.status}`)
      }
    } catch (error) {
      console.error('groupService: 踢出成员失败', error)
      throw error
    }
  },

  /**
   * 解散群聊
   *
   * 执行流程：
   * 1. 构建请求参数，确保包含群 ID
   * 2. 发送 POST 请求到 /api/groups/disband
   * 3. 记录解散结果
   * 4. 注意：只有群主才能解散群聊
   *
   * 数据流：
   * - 输入：DisbandGroupParams（群 ID）
   * - 输出：无
   * - 副作用：在 console 记录操作日志，群聊被解散
   *
   * 使用场景：
   * - 群主决定解散群聊
   * - 系统根据规则解散违规群聊
   *
   * @param {DisbandGroupParams} params - 解散群聊的参数
   * @returns {Promise<void>} 无返回值
   * @throws {Error} 解散失败时抛出错误
   */
  async disbandGroup (params: DisbandGroupParams): Promise<void> {
    try {
      // 确保所有字段都包含
      const requestParams = {
        gid: params.gid || null,
      }

      console.log('groupService: 解散群聊', requestParams)
      const response = await authApi.post('/groups/disband', requestParams)

      if (response.status === 200) {
        console.log('groupService: 解散群聊成功')
      } else {
        throw new Error(`解散群聊失败：${response.status}`)
      }
    } catch (error) {
      console.error('groupService: 解散群聊失败', error)
      throw error
    }
  },

  /**
   * 设置成员信息
   *
   * 执行流程：
   * 1. 构建请求参数，包含所有可设置的成员信息字段
   * 2. 发送 POST 请求到 /api/groups/member_set
   * 3. 记录设置结果
   *
   * 数据流：
   * - 输入：SetMemberParams（群 ID、免打扰、置顶、备注、昵称等）
   * - 输出：无
   * - 副作用：在 console 记录操作日志，更新用户在群中的个性化设置
   *
   * 使用场景：
   * - 用户设置群聊的免打扰状态
   * - 用户置顶群聊
   * - 用户修改群聊备注或昵称
   * - 批量更新多个设置项
   *
   * @param {SetMemberParams} params - 成员信息设置参数
   * @returns {Promise<void>} 无返回值
   * @throws {Error} 设置失败时抛出错误
   */
  async setMemberInfo (params: SetMemberParams): Promise<void> {
    try {
      // 确保所有字段都包含，undefined 字段设置为 null
      const requestParams = {
        gid: params.gid || null,
        do_not_disturb: params.do_not_disturb ?? null,
        is_pinned: params.is_pinned ?? null,
        remark: params.remark || null,
        nickname: params.nickname || null,
      }

      console.log('groupService: 设置成员信息', requestParams)
      const response = await authApi.post('/groups/member_set', requestParams)

      if (response.status === 200) {
        console.log('groupService: 设置成员信息成功')
      } else {
        throw new Error(`设置成员信息失败：${response.status}`)
      }
    } catch (error) {
      console.error('groupService: 设置成员信息失败', error)
      throw error
    }
  },

  /**
   * 设置群信息
   *
   * 执行流程：
   * 1. 构建请求参数，包含所有可设置的群信息字段
   * 2. 发送 POST 请求到 /api/groups/setting
   * 3. 记录设置结果
   * 4. 注意：只有群主和管理员有权限修改
   *
   * 数据流：
   * - 输入：SetGroupInfoParams（群 ID、群名称、头像、简介等）
   * - 输出：无
   * - 副作用：在 console 记录操作日志，更新群信息
   *
   * 使用场景：
   * - 群主或管理员修改群名称
   * - 更新群头像或群简介
   * - 批量更新多个群信息字段
   *
   * @param {SetGroupInfoParams} params - 群信息设置参数
   * @returns {Promise<void>} 无返回值
   * @throws {Error} 设置失败时抛出错误
   */
  async setGroupInfo (params: SetGroupInfoParams): Promise<void> {
    try {
      // 确保所有字段都包含，undefined 字段设置为 null
      const requestParams = {
        gid: params.gid || null,
        group_name: params.group_name || null,
        group_avatar: params.group_avatar || null,
        group_intro: params.group_intro || null,
      }

      console.log('groupService: 设置群信息', requestParams)
      const response = await authApi.post('/groups/setting', requestParams)

      if (response.status === 200) {
        console.log('groupService: 设置群信息成功')
      } else {
        throw new Error(`设置群信息失败：${response.status}`)
      }
    } catch (error) {
      console.error('groupService: 设置群信息失败', error)
      throw error
    }
  },

  /**
   * 获取群公告列表
   *
   * 执行流程：
   * 1. 构建请求参数，确保包含群 ID
   * 2. 发送 POST 请求到 /api/groups/get_announcements
   * 3. 返回群公告列表
   * 4. 记录操作日志
   *
   * 数据流：
   * - 输入：GetGroupAnnouncementsParams（群 ID）
   * - 输出：GetGroupAnnouncementsResponse（群公告列表）
   * - 副作用：在 console 记录操作日志
   *
   * 使用场景：
   * - 用户查看群公告历史
   * - 管理员管理群公告
   * - 群聊页面展示重要公告
   *
   * @param {GetGroupAnnouncementsParams} params - 获取群公告的参数
   * @returns {Promise<GetGroupAnnouncementsResponse>} 群公告列表响应
   * @throws {Error} 获取失败时抛出错误
   */
  async getGroupAnnouncements (params: GetGroupAnnouncementsParams): Promise<GetGroupAnnouncementsResponse> {
    try {
      // 确保所有字段都包含
      const requestParams = {
        gid: params.gid || null,
      }

      console.log('groupService: 获取群公告', requestParams)
      const response = await authApi.post<GetGroupAnnouncementsResponse>('/groups/get_announcements', requestParams)

      if (response.status === 200) {
        console.log('groupService: 获取群公告成功', response.data)
        return response.data
      } else {
        throw new Error(`获取群公告失败：${response.status}`)
      }
    } catch (error) {
      console.error('groupService: 获取群公告失败', error)
      throw error
    }
  },

  /**
   * 获取群成员列表
   *
   * 执行流程：
   * 1. 构建请求参数，确保包含群 ID
   * 2. 发送 POST 请求到 /api/groups/get_members
   * 3. 返回群成员列表，包含成员信息、角色和总数
   * 4. 记录操作日志
   *
   * 数据流：
   * - 输入：GetGroupMembersParams（群 ID）
   * - 输出：GetGroupMembersResponse（群成员列表）
   * - 副作用：在 console 记录操作日志
   *
   * 使用场景：
   * - 进入群成员页面时加载成员列表
   * - 管理员查看群成员信息
   * - 获取成员角色信息用于权限验证
   *
   * @param {GetGroupMembersParams} params - 获取群成员的参数
   * @returns {Promise<GetGroupMembersResponse>} 群成员列表响应
   * @throws {Error} 获取失败时抛出错误
   */
  async getGroupMembers (params: GetGroupMembersParams): Promise<GetGroupMembersResponse> {
    try {
      // 确保所有字段都包含
      const requestParams = {
        gid: params.gid || null,
      }

      console.log('groupService: 获取群成员列表', requestParams)
      const response = await authApi.post<GetGroupMembersResponse>('/groups/get_members', requestParams)

      if (response.status === 200) {
        console.log('groupService: 获取群成员列表成功', response.data)
        return response.data
      } else {
        throw new Error(`获取群成员列表失败：${response.status}`)
      }
    } catch (error) {
      console.error('groupService: 获取群成员列表失败', error)
      throw error
    }
  },

  /**
   * 转让群主
   *
   * 执行流程：
   * 1. 构建请求参数，包含群 ID 和新群主 ID
   * 2. 发送 POST 请求到 /api/groups/transfer_ownership
   * 3. 记录转让结果
   * 4. 注意：只有当前群主才能转让群主权限
   *
   * 数据流：
   * - 输入：TransferOwnershipParams（群 ID、新群主 ID）
   * - 输出：无
   * - 副作用：在 console 记录操作日志，群主权限被转移
   *
   * 使用场景：
   * - 群主主动转让群聊
   * - 群主退出前转让权限
   *
   * @param {TransferOwnershipParams} params - 转让群主的参数
   * @returns {Promise<void>} 无返回值
   * @throws {Error} 转让失败时抛出错误
   */
  async transferOwnership (params: TransferOwnershipParams): Promise<void> {
    try {
      // 确保所有字段都包含
      const requestParams = {
        gid: params.gid || null,
        uid: params.uid || null,
      }

      console.log('groupService: 转让群主', requestParams)
      const response = await authApi.post('/groups/transfer_ownership', requestParams)

      if (response.status === 200) {
        console.log('groupService: 转让群主成功')
      } else {
        throw new Error(`转让群主失败：${response.status}`)
      }
    } catch (error) {
      console.error('groupService: 转让群主失败', error)
      throw error
    }
  },

  /**
   * 设置管理员
   *
   * 执行流程：
   * 1. 构建请求参数，包含群 ID 和成员 ID
   * 2. 发送 POST 请求到 /api/groups/set_admin
   * 3. 记录设置结果
   * 4. 注意：只有群主才能设置或取消管理员
   *
   * 数据流：
   * - 输入：SetAdminParams（群 ID、成员 ID）
   * - 输出：无
   * - 副作用：在 console 记录操作日志，成员管理员状态被改变
   *
   * 使用场景：
   * - 群主设置新的管理员
   * - 群主取消管理员权限
   *
   * @param {SetAdminParams} params - 设置管理员的参数
   * @returns {Promise<void>} 无返回值
   * @throws {Error} 设置失败时抛出错误
   */
  async setAdmin (params: SetAdminParams): Promise<void> {
    try {
      // 确保所有字段都包含
      const requestParams = {
        gid: params.gid || null,
        uid: params.uid || null,
      }

      console.log('groupService: 设置管理员', requestParams)
      const response = await authApi.post('/groups/set_admin', requestParams)

      if (response.status === 200) {
        console.log('groupService: 设置管理员成功')
      } else {
        throw new Error(`设置管理员失败：${response.status}`)
      }
    } catch (error) {
      console.error('groupService: 设置管理员失败', error)
      throw error
    }
  },
}
