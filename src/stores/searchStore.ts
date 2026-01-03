/**
 * 搜索状态管理 Store
 *
 * 功能：
 * - 管理用户和群聊搜索结果
 * - 处理搜索状态和分页
 * - 维护两个独立的搜索结果列表
 *
 * 使用场景：
 * - 统一搜索框组件
 * - 添加好友/群聊前的搜索
 * - 全局搜索功能
 */

import type {
  GroupSearchResponse,
  GroupSearchResult,
  PaginationInfo,
  SearchState,
  UserSearchResponse,
  UserSearchResult,
} from '@/types/search'
import { defineStore } from 'pinia'
import { computed, readonly, ref } from 'vue'
import { SearchType } from '@/types/search'

export const useSearchStore = defineStore('search', () => {
  // ========== 状态定义 ==========

  /**
   * 搜索状态
   * 包含查询词、搜索类型、结果列表和分页信息
   */
  const state = ref<SearchState>({
    query: '',
    type: SearchType.USER,
    userResults: [],
    groupResults: [],
    userPagination: {
      current_page: 0,
      total_pages: 0,
      total_items: 0,
      hasMore: false,
    },
    groupPagination: {
      current_page: 0,
      total_pages: 0,
      total_items: 0,
      hasMore: false,
    },
  })

  /**
   * 加载状态
   */
  const isLoading = ref(false)
  const isLoadingMore = ref(false)

  // ========== 计算属性 ==========

  /**
   * 当前搜索结果
   * 根据搜索类型返回对应的结果列表
   */
  const currentResults = computed(() => {
    return state.value.type === SearchType.USER
      ? state.value.userResults
      : state.value.groupResults
  })

  /**
   * 当前的分页信息
   */
  const currentPagination = computed(() => {
    return state.value.type === SearchType.USER
      ? state.value.userPagination
      : state.value.groupPagination
  })

  /**
   * 是否有更多结果
   */
  const hasMoreResults = computed(() => {
    return currentPagination.value.hasMore
  })

  /**
   * 结果总数
   */
  const totalResults = computed(() => {
    return currentPagination.value.total_items
  })

  /**
   * 是否有搜索结果
   */
  const hasResults = computed(() => {
    return currentResults.value.length > 0
  })

  // ========== Actions ==========

  /**
   * 设置搜索类型
   *
   * 执行流程：
   * 1. 更新搜索类型
   * 2. 记录日志
   *
   * @param type 新的搜索类型
   */
  function setSearchType (type: SearchType) {
    state.value.type = type
    console.log('searchStore: 切换搜索类型', type)
  }

  /**
   * 设置用户搜索结果
   *
   * 执行流程：
   * 1. 直接使用已转换的用户结果数据
   * 2. 更新用户结果列表
   * 3. 更新分页信息
   *
   * @param users 已转换的用户搜索结果数组
   * @param pagination 分页信息
   */
  function setUserSearchResults (users: UserSearchResult[], pagination: PaginationInfo) {
    // 直接保存已转换的用户搜索结果
    state.value.userResults = users

    // 更新用户搜索分页信息
    state.value.userPagination = { ...pagination }

    console.log(`searchStore: 设置用户搜索结果 - ${pagination.total_items} 个`)
  }

  /**
   * 设置群聊搜索结果
   *
   * 执行流程：
   * 1. 直接使用已转换的群聊结果数据
   * 2. 更新群聊结果列表
   * 3. 更新分页信息
   *
   * @param groups 已转换的群聊搜索结果数组
   * @param pagination 分页信息
   */
  function setGroupSearchResults (groups: GroupSearchResult[], pagination: PaginationInfo) {
    // 直接保存已转换的群聊搜索结果
    state.value.groupResults = groups

    // 更新群聊搜索分页信息
    state.value.groupPagination = { ...pagination }

    console.log(`searchStore: 设置群聊搜索结果 - ${pagination.total_items} 个`)
  }

  /**
   * 追加用户搜索结果（用于加载更多）
   *
   * @param users 已转换的用户搜索结果数组
   * @param pagination 更新的分页信息
   */
  function appendUserSearchResults (users: UserSearchResult[], pagination: PaginationInfo) {
    state.value.userResults.push(...users)

    // 更新分页信息
    state.value.userPagination = { ...pagination }

    console.log(`searchStore: 追加用户搜索结果 - 新增 ${users.length} 个`)
  }

  /**
   * 追加群聊搜索结果（用于加载更多）
   *
   * @param groups 已转换的群聊搜索结果数组
   * @param pagination 更新的分页信息
   */
  function appendGroupSearchResults (groups: GroupSearchResult[], pagination: PaginationInfo) {
    state.value.groupResults.push(...groups)

    // 更新分页信息
    state.value.groupPagination = { ...pagination }

    console.log(`searchStore: 追加群聊搜索结果 - 新增 ${groups.length} 个`)
  }

  /**
   * 设置加载状态
   *
   * @param loading 是否正在加载
   */
  function setLoading (loading: boolean) {
    isLoading.value = loading
    console.log('searchStore: 设置加载状态', loading)
  }

  /**
   * 设置加载更多状态
   *
   * @param loading 是否正在加载更多
   */
  function setLoadingMore (loading: boolean) {
    isLoadingMore.value = loading
    console.log('searchStore: 设置加载更多状态', loading)
  }

  /**
   * 设置搜索查询词
   *
   * @param query 搜索查询词
   */
  function setQuery (query: string) {
    state.value.query = query
    console.log('searchStore: 设置查询词', query)
  }

  /**
   * 清除搜索结果
   *
   * 使用场景：
   * - 搜索框被清空时
   * - 切换搜索类型时
   * - 组件卸载时清理
   */
  function clearResults () {
    state.value.query = ''
    state.value.userResults = []
    state.value.groupResults = []

    // 重置分页信息
    const resetPagination: PaginationInfo = {
      current_page: 0,
      total_pages: 0,
      total_items: 0,
      hasMore: false,
    }

    state.value.userPagination = { ...resetPagination }
    state.value.groupPagination = { ...resetPagination }

    console.log('searchStore: 清除搜索结果')
  }

  /**
   * 重置所有状态
   *
   * 使用场景：
   * - 用户登出时清理数据
   * - 切换账号时重置状态
   */
  function reset () {
    clearResults()
    state.value.type = SearchType.USER
    isLoading.value = false
    isLoadingMore.value = false
    console.log('searchStore: 重置所有状态')
  }

  // ========== 返回状态和方法 ==========

  return {
    // 状态（只读，防止外部直接修改）
    state: readonly(state),
    isLoading: readonly(isLoading),
    isLoadingMore: readonly(isLoadingMore),

    // 计算属性
    currentResults: readonly(currentResults),
    currentPagination: readonly(currentPagination),
    hasMoreResults,
    totalResults,
    hasResults,

    // 方法
    setSearchType,
    setUserSearchResults,
    setGroupSearchResults,
    appendUserSearchResults,
    appendGroupSearchResults,
    setLoading,
    setLoadingMore,
    setQuery,
    clearResults,
    reset,
  }
})
