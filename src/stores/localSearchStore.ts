/**
 * 本地搜索状态管理 Store
 *
 * 执行流程：
 * 1. 管理搜索状态（关键词、类型、结果等）
 * 2. 提供状态更新方法
 * 3. 管理分页信息
 * 4. 维护搜索历史
 * 5. 提供计算属性便于组件使用
 *
 * 数据流：
 * - 输入：Composable 层的状态更新请求
 * - 输出：响应式的搜索状态
 * - 副作用：状态变更触发UI更新
 *
 * 使用场景：
 * - 存储和管理搜索相关状态
 * - 提供搜索历史功能
 * - 管理搜索结果的分页
 */

import type {
  LocalSearchParams,
  LocalSearchResult,
  LocalSearchStats,
  MessageSearchResult
} from '@/types/localSearch'
import { LocalSearchType } from '@/types/localSearch'

import { defineStore } from 'pinia'
import { computed, readonly, ref } from 'vue'

/**
 * 分页信息接口
 *
 * @interface PaginationInfo
 */
interface PaginationInfo {
  /** 偏移量 */
  offset: number
  /** 每页限制 */
  limit: number
  /** 是否有更多数据 */
  hasMore: boolean
}

/**
 * 本地搜索 Store
 *
 * 使用 Composition API 模式定义 Store
 */
export const useLocalSearchStore = defineStore('localSearch', () => {
  // ========== 状态定义 ==========

  /**
   * 搜索状态
   *
   * 包含查询关键词、搜索类型、结果列表等核心状态
   */
  const state = ref({
    /** 当前搜索关键词 */
    query: '',
    /** 当前搜索类型 */
    type: LocalSearchType.ALL,
    /** 搜索结果 */
    results: {
      friends: [],
      groups: [],
      chats: [],
      messages: [],
    } as LocalSearchResult,
    /** 搜索结果统计 */
    stats: {
      totalFriends: 0,
      totalGroups: 0,
      totalChats: 0,
      totalMessages: 0,
      totalResults: 0,
    } as LocalSearchStats,
    /** 分页信息 */
    pagination: {
      friends: { offset: 0, limit: 20, hasMore: true } as PaginationInfo,
      groups: { offset: 0, limit: 20, hasMore: true } as PaginationInfo,
      chats: { offset: 0, limit: 20, hasMore: true } as PaginationInfo,
      messages: { offset: 0, limit: 20, hasMore: true } as PaginationInfo,
    },
  })

  /**
   * 加载状态
   */
  const isLoading = ref(false)
  const isLoadingMore = ref(false)

  /**
   * 搜索历史
   */
  const searchHistory = ref<string[]>([])
  const maxHistoryItems = 10

  // ========== 计算属性 ==========

  /**
   * 获取当前搜索类型的结果
   *
   * 根据当前搜索类型返回对应的结果列表
   */
  const currentTypeResults = computed(() => {
    switch (state.value.type) {
      case LocalSearchType.FRIEND: {
        return state.value.results.friends
      }
      case LocalSearchType.GROUP: {
        return state.value.results.groups
      }
      case LocalSearchType.CHAT: {
        return state.value.results.chats
      }
      case LocalSearchType.MESSAGE: {
        return state.value.results.messages
      }
      case LocalSearchType.ALL:
      default: {
        // 全局搜索时返回所有结果的混合
        return [
          ...state.value.results.friends,
          ...state.value.results.groups,
          ...state.value.results.chats,
          ...state.value.results.messages,
        ]
      }
    }
  })

  /**
   * 是否有搜索结果
   */
  const hasResults = computed(() => {
    return state.value.stats.totalResults > 0
  })

  /**
   * 获取当前类型的分页信息
   */
  const currentPagination = computed(() => {
    switch (state.value.type) {
      case LocalSearchType.FRIEND: {
        return state.value.pagination.friends
      }
      case LocalSearchType.GROUP: {
        return state.value.pagination.groups
      }
      case LocalSearchType.CHAT: {
        return state.value.pagination.chats
      }
      case LocalSearchType.MESSAGE: {
        return state.value.pagination.messages
      }
      default: {
        return state.value.pagination.friends
      }
    }
  })

  /**
   * 是否正在加载
   */
  const loading = computed(() => isLoading.value || isLoadingMore.value)

  // ========== Actions ==========

  /**
   * 设置搜索类型
   *
   * 执行流程：
   * 1. 更新搜索类型
   * 2. 可选：自动触发新搜索
   *
   * 数据流：
   * - 输入：搜索类型
   * - 输出：更新 state.type
   *
   * 使用场景：
   * - 用户切换搜索类型时
   *
   * @param {LocalSearchType} type - 搜索类型
   */
  function setSearchType (type: LocalSearchType) {
    console.log(`localSearchStore: 切换搜索类型为 ${type}`)
    state.value.type = type
  }

  /**
   * 设置查询关键词
   *
   * 执行流程：
   * 1. 更新查询关键词
   * 2. 如果有内容，添加到历史记录
   *
   * 数据流：
   * - 输入：查询关键词
   * - 输出：更新 state.query 和 searchHistory
   *
   * 使用场景：
   * - 用户输入搜索关键词时
   *
   * @param {string} query - 查询关键词
   */
  function setQuery (query: string) {
    console.log(`localSearchStore: 设置查询关键词为 "${query}"`)
    state.value.query = query

    // 如果查询不为空，添加到历史记录
    if (query) {
      addToHistory(query)
    }
  }

  /**
   * 设置搜索结果
   *
   * 执行流程：
   * 1. 更新搜索结果
   * 2. 重新计算统计信息
   * 3. 重置分页信息
   *
   * 数据流：
   * - 输入：搜索结果对象
   * - 输出：更新 state.results 和 state.stats
   *
   * 使用场景：
   * - 新搜索完成时设置结果
   *
   * @param {LocalSearchResult} results - 搜索结果
   */
  function setResults (results: LocalSearchResult) {
    console.log('localSearchStore: 设置搜索结果')
    state.value.results = results

    // 更新统计信息
    state.value.stats = {
      totalFriends: results.friends.length,
      totalGroups: results.groups.length,
      totalChats: results.chats.length,
      totalMessages: results.messages.length,
      totalResults: results.friends.length + results.groups.length
        + results.chats.length + results.messages.length,
    }

    // 重置分页信息
    resetPagination()
  }

  /**
   * 追加搜索结果
   *
   * 执行流程：
   * 1. 将新结果追加到现有结果
   * 2. 更新统计信息
   *
   * 数据流：
   * - 输入：新的搜索结果
   * - 输出：合并到现有结果中
   *
   * 使用场景：
   * - 加载更多结果时
   *
   * @param {LocalSearchResult} newResults - 新的搜索结果
   */
  function appendResults (newResults: LocalSearchResult) {
    console.log('localSearchStore: 追加搜索结果')
    state.value.results.friends.push(...newResults.friends)
    state.value.results.groups.push(...newResults.groups)
    state.value.results.chats.push(...newResults.chats)
    state.value.results.messages.push(...newResults.messages)

    // 更新统计信息
    setResults(state.value.results)
  }

  /**
   * 设置加载状态
   *
   * @param {boolean} loading - 是否正在加载
   */
  function setLoading (loading: boolean) {
    console.log(`localSearchStore: 设置加载状态为 ${loading}`)
    isLoading.value = loading
  }

  /**
   * 设置加载更多状态
   *
   * @param {boolean} loading - 是否正在加载更多
   */
  function setLoadingMore (loading: boolean) {
    console.log(`localSearchStore: 设置加载更多状态为 ${loading}`)
    isLoadingMore.value = loading
  }

  /**
   * 更新分页信息
   *
   * 执行流程：
   * 1. 更新指定类型的偏移量
   * 2. 更新是否有更多数据标记
   *
   * 数据流：
   * - 输入：搜索类型、偏移量、是否有更多
   * - 输出：更新 pagination
   *
   * 使用场景：
   * - 分页加载后更新分页信息
   *
   * @param {LocalSearchType} type - 搜索类型
   * @param {number} offset - 新的偏移量
   * @param {boolean} hasMore - 是否有更多数据
   */
  function updatePagination (type: LocalSearchType, offset: number, hasMore: boolean) {
    console.log(`localSearchStore: 更新 ${type} 的分页信息`)
    switch (type) {
      case LocalSearchType.FRIEND: {
        state.value.pagination.friends = {
          ...state.value.pagination.friends,
          offset,
          hasMore,
        }
        break
      }
      case LocalSearchType.GROUP: {
        state.value.pagination.groups = {
          ...state.value.pagination.groups,
          offset,
          hasMore,
        }
        break
      }
      case LocalSearchType.CHAT: {
        state.value.pagination.chats = {
          ...state.value.pagination.chats,
          offset,
          hasMore,
        }
        break
      }
      case LocalSearchType.MESSAGE: {
        state.value.pagination.messages = {
          ...state.value.pagination.messages,
          offset,
          hasMore,
        }
        break
      }
    }
  }

  /**
   * 重置分页信息
   */
  function resetPagination () {
    state.value.pagination = {
      friends: { offset: 0, limit: 20, hasMore: true },
      groups: { offset: 0, limit: 20, hasMore: true },
      chats: { offset: 0, limit: 20, hasMore: true },
      messages: { offset: 0, limit: 20, hasMore: true },
    }
  }

  /**
   * 添加到搜索历史
   *
   * 执行流程：
   * 1. 移除重复项（如果有）
   * 2. 添加到列表开头
   * 3. 限制历史记录数量
   *
   * 数据流：
   * - 输入：查询关键词
   * - 输出：更新 searchHistory
   *
   * 使用场景：
   * - 每次搜索后自动记录
   *
   * @param {string} query - 查询关键词
   */
  function addToHistory (query: string) {
    // 移除重复项
    const index = searchHistory.value.indexOf(query)
    if (index !== -1) {
      searchHistory.value.splice(index, 1)
    }

    // 添加到开头
    searchHistory.value.unshift(query)

    // 限制历史记录数量
    if (searchHistory.value.length > maxHistoryItems) {
      searchHistory.value = searchHistory.value.slice(0, maxHistoryItems)
    }

    console.log(`localSearchStore: 添加 "${query}" 到搜索历史`)
  }

  /**
   * 从历史记录中移除
   *
   * @param {string} query - 要移除的查询关键词
   */
  function removeFromHistory (query: string) {
    const index = searchHistory.value.indexOf(query)
    if (index !== -1) {
      searchHistory.value.splice(index, 1)
      console.log(`localSearchStore: 从历史记录中移除 "${query}"`)
    }
  }

  /**
   * 清空搜索历史
   */
  function clearHistory () {
    console.log('localSearchStore: 清空搜索历史')
    searchHistory.value = []
  }

  /**
   * 清除搜索结果
   *
   * 执行流程：
   * 1. 清空查询关键词
   * 2. 清空搜索结果
   * 3. 重置统计信息
   * 4. 重置分页
   *
   * 使用场景：
   * - 用户清空搜索框时
   * - 开始新搜索前
   */
  function clearResults () {
    console.log('localSearchStore: 清除搜索结果')
    state.value.query = ''
    state.value.results = {
      friends: [],
      groups: [],
      chats: [],
      messages: [],
    }
    state.value.stats = {
      totalFriends: 0,
      totalGroups: 0,
      totalChats: 0,
      totalMessages: 0,
      totalResults: 0,
    }

    // 重置分页
    resetPagination()
  }

  /**
   * 重置整个搜索状态
   *
   * 执行流程：
   * 1. 清除所有结果
   * 2. 清空历史记录
   * 3. 重置搜索类型
   * 4. 重置加载状态
   *
   * 使用场景：
   * - 用户登出时
   * - 重置应用状态时
   */
  function reset () {
    console.log('localSearchStore: 重置搜索状态')
    clearResults()
    clearHistory()
    state.value.type = LocalSearchType.ALL
    isLoading.value = false
    isLoadingMore.value = false
  }

  // ========== 返回接口 ==========

  return {
    // 状态（只读）
    state: readonly(state),
    isLoading: readonly(isLoading),
    isLoadingMore: readonly(isLoadingMore),
    searchHistory: readonly(searchHistory),

    // 计算属性
    currentTypeResults,
    hasResults,
    currentPagination,
    loading,

    // 方法
    setSearchType,
    setQuery,
    setResults,
    appendResults,
    setLoading,
    setLoadingMore,
    updatePagination,
    addToHistory,
    removeFromHistory,
    clearHistory,
    clearResults,
    reset,
  }
})
