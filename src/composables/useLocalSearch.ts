/**
 * 本地搜索功能 Composable
 *
 * 执行流程：
 * 1. 作为 Store 的门面，提供统一接口
 * 2. 调用 Service 执行搜索逻辑
 * 3. 处理防抖、缓存、错误处理等业务逻辑
 * 4. 管理本地状态（与 Store 无关的组件级状态）
 * 5. 提供用户反馈（snackbar）
 *
 * 数据流：
 * - 输入：用户输入的搜索关键词
 * - 处理：防抖 -> 缓存检查 -> Service 调用 -> 结果转换 -> Store 更新
 * - 输出：响应式的搜索状态给组件
 *
 * 使用场景：
 * - 组件中集成本地搜索功能
 * - 提供搜索历史记录
 * - 处理搜索相关的用户交互
 */

import { computed, ref } from 'vue'
import { useSnackbar } from '@/composables/useSnackbar'
import { localSearchService } from '@/service/localSearchService'
import { useLocalSearchStore } from '@/stores/localSearchStore'
import { LocalSearchType } from '@/types/localSearch'

/**
 * 本地搜索 Hook 配置选项
 *
 * @interface UseLocalSearchOptions
 */
interface UseLocalSearchOptions {
  /** 默认搜索类型 */
  defaultType?: LocalSearchType
  /** 防抖延迟时间（毫秒） */
  debounceDelay?: number
  /** 是否启用缓存 */
  enableCache?: boolean
}

/**
 * 本地搜索 Hook
 *
 * 提供完整的本地搜索功能，包括：
 * - 防抖搜索
 * - 结果缓存
 * - 搜索历史
 * - 错误处理
 * - 分页加载
 *
 * @param {UseLocalSearchOptions} options - 配置选项
 * @returns {Object} 搜索相关的状态和方法
 */
export function useLocalSearch (options: UseLocalSearchOptions = {}) {
  // 配置选项
  const {
    defaultType = LocalSearchType.ALL,
    debounceDelay = 300,
    enableCache = true,
  } = options

  // 依赖注入
  const localSearchStore = useLocalSearchStore()
  const { showError } = useSnackbar()

  // 本地状态
  const query = ref('')
  const searchType = ref<LocalSearchType>(defaultType)
  const searchCache = new Map<string, any>() // 使用 any 类型简化缓存实现
  const maxCacheSize = 100

  // 防抖定时器
  let debounceTimer: number | null = null

  // ========== 计算属性 ==========

  /**
   * 当前搜索结果
   */
  const results = computed(() => localSearchStore.currentTypeResults)

  /**
   * 是否正在加载
   */
  const isLoading = computed(() => localSearchStore.loading)

  /**
   * 是否正在加载更多
   */
  const isLoadingMore = computed(() => localSearchStore.isLoadingMore)

  /**
   * 是否有搜索结果
   */
  const hasResults = computed(() => localSearchStore.hasResults)

  /**
   * 搜索结果统计
   */
  const stats = computed(() => localSearchStore.state.stats)

  /**
   * 搜索历史记录
   */
  const searchHistory = computed(() => localSearchStore.searchHistory)

  /**
   * 当前分页信息
   */
  const pagination = computed(() => localSearchStore.currentPagination)

  // ========== 核心方法 ==========

  /**
   * 切换搜索类型
   *
   * 执行流程：
   * 1. 更新本地和 Store 的搜索类型
   * 2. 如果当前有查询，重新执行搜索
   *
   * 数据流：
   * - 输入：新的搜索类型
   * - 处理：更新状态 -> 触发搜索（如果有查询）
   * - 输出：更新后的搜索结果
   *
   * 使用场景：
   * - 用户点击搜索类型切换按钮
   * - 程序化切换搜索类型
   *
   * @param {LocalSearchType} type - 新的搜索类型
   */
  const switchSearchType = (type: LocalSearchType) => {
    console.log(`useLocalSearch: 切换搜索类型为 ${type}`)
    searchType.value = type
    localSearchStore.setSearchType(type)

    // 如果当前有查询，重新搜索
    if (query.value && query.value.trim()) {
      performSearch(query.value)
    }
  }

  /**
   * 执行搜索（带防抖）
   *
   * 执行流程：
   * 1. 更新查询状态
   * 2. 清除之前的防抖定时器
   * 3. 检查查询是否为空
   * 4. 设置新的防抖定时器
   *
   * 数据流：
   * - 输入：搜索关键词和是否立即执行标志
   * - 处理：防抖 -> 触发实际搜索
   * - 输出：搜索结果（异步）
   *
   * 使用场景：
   * - 用户输入搜索框时
   * - 程序化触发搜索
   *
   * @param {string} searchQuery - 搜索关键词
   * @param {boolean} immediate - 是否立即执行（跳过防抖）
   */
  const search = (searchQuery: string, immediate = false) => {
    query.value = searchQuery

    // 清除之前的防抖定时器
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }

    // 检查查询是否为空
    if (!searchQuery || searchQuery.trim().length === 0) {
      clearSearch()
      return
    }

    // 立即执行或防抖
    if (immediate) {
      performSearch(searchQuery)
    } else {
      debounceTimer = setTimeout(() => {
        performSearch(searchQuery)
      }, debounceDelay)
    }
  }

  /**
   * 实际执行搜索
   *
   * 执行流程：
   * 1. 更新 Store 状态
   * 2. 生成缓存键
   * 3. 检查缓存
   * 4. 准备搜索参数
   * 5. 调用 Service 执行搜索
   * 6. 更新 Store 和缓存
   *
   * 数据流：
   * - 输入：搜索关键词
   * - 处理：缓存检查 -> Service 调用 -> 结果存储
   * - 输出：更新 Store 状态
   *
   * 使用场景：
   * - 防抖后实际执行搜索
   * - 立即搜索
   *
   * @param {string} searchQuery - 搜索关键词
   */
  const performSearch = async (searchQuery: string) => {
    try {
      console.log(`useLocalSearch: 开始搜索 "${searchQuery}"`)

      // 更新 Store 状态
      localSearchStore.setQuery(searchQuery.trim())
      localSearchStore.setLoading(true)

      // 生成缓存键
      const cacheKey = generateCacheKey(searchQuery, searchType.value)

      // 检查缓存
      if (enableCache && searchCache.has(cacheKey)) {
        const cachedResults = searchCache.get(cacheKey)
        localSearchStore.setResults(cachedResults)
        console.log('useLocalSearch: 使用缓存结果')
        return
      }

      // 准备搜索参数
      const params = {
        query: searchQuery.trim(),
        type: searchType.value,
        limit: 20,
        offset: 0,
      }

      // 执行搜索
      const results = await localSearchService.searchLocal(params)

      // 更新状态
      localSearchStore.setResults(results)

      // 缓存结果
      if (enableCache) {
        setCache(cacheKey, results)
      }

      console.log(`useLocalSearch: 搜索完成 - ${localSearchStore.state.stats.totalResults} 个结果`)
    } catch (error) {
      console.error('useLocalSearch: 搜索失败', error)
      showError('搜索失败，请重试')
    } finally {
      localSearchStore.setLoading(false)
    }
  }

  /**
   * 加载更多结果
   *
   * 执行流程：
   * 1. 检查是否可以加载更多
   * 2. 更新加载状态
   * 3. 准备分页参数
   * 4. 调用 Service 加载更多
   * 5. 追加结果并更新分页
   *
   * 数据流：
   * - 输入：无（使用当前状态）
   * - 处理：分页加载 -> 结果追加
   * - 输出：更新 Store 状态
   *
   * 使用场景：
   * - 用户滚动到底部时自动加载
   * - 点击加载更多按钮
   */
  const loadMore = async () => {
    const currentPagination = localSearchStore.currentPagination
    if (!currentPagination.hasMore || isLoadingMore.value) {
      return
    }

    try {
      console.log('useLocalSearch: 加载更多结果')
      localSearchStore.setLoadingMore(true)

      const params = {
        query: localSearchStore.state.query,
        type: searchType.value,
        limit: 20,
        offset: currentPagination.offset + currentPagination.limit,
      }

      const newResults = await localSearchService.searchLocal(params)
      localSearchStore.appendResults(newResults)

      // 更新分页信息
      const hasMore = newResults.friends.length >= params.limit
        || newResults.groups.length >= params.limit
        || newResults.chats.length >= params.limit
        || newResults.messages.length >= params.limit
      localSearchStore.updatePagination(searchType.value, params.offset, hasMore)

      console.log(`useLocalSearch: 加载更多完成 - 新增 ${
        newResults.friends.length + newResults.groups.length
        + newResults.chats.length + newResults.messages.length
      } 个结果`)
    } catch (error) {
      console.error('useLocalSearch: 加载更多失败', error)
      showError('加载更多失败，请重试')
    } finally {
      localSearchStore.setLoadingMore(false)
    }
  }

  /**
   * 清除搜索
   *
   * 执行流程：
   * 1. 清空本地状态
   * 2. 清除防抖定时器
   * 3. 清除 Store 结果
   *
   * 使用场景：
   * - 用户清空搜索框
   * - 组件卸载时
   */
  const clearSearch = () => {
    console.log('useLocalSearch: 清除搜索')
    query.value = ''

    // 清除防抖定时器
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }

    // 清除搜索结果
    localSearchStore.clearResults()
  }

  /**
   * 重置搜索状态
   *
   * 执行流程：
   * 1. 清除搜索
   * 2. 重置搜索类型
   * 3. 重置 Store 状态
   * 4. 清除缓存
   *
   * 使用场景：
   * - 用户登出时
   * - 重置应用状态时
   */
  const reset = () => {
    console.log('useLocalSearch: 重置搜索状态')
    clearSearch()
    searchType.value = defaultType
    localSearchStore.setSearchType(defaultType)
    localSearchStore.reset()
    clearCache()
  }

  /**
   * 从历史记录搜索
   *
   * 执行流程：
   * 1. 使用历史记录项作为查询词
   * 2. 立即执行搜索（不防抖）
   *
   * 使用场景：
   * - 用户点击历史记录项
   *
   * @param {string} historyQuery - 历史查询词
   */
  const searchFromHistory = (historyQuery: string) => {
    console.log(`useLocalSearch: 从历史记录搜索 "${historyQuery}"`)
    search(historyQuery, true)
  }

  /**
   * 删除历史记录项
   *
   * @param {string} query - 要删除的查询词
   */
  const removeFromHistory = (query: string) => {
    console.log(`useLocalSearch: 删除历史记录项 "${query}"`)
    localSearchStore.removeFromHistory(query)
  }

  /**
   * 清空历史记录
   */
  const clearHistory = () => {
    console.log('useLocalSearch: 清空历史记录')
    localSearchStore.clearHistory()
  }

  // ========== 缓存管理 ==========

  /**
   * 生成缓存键
   *
   * @param {string} query - 查询词
   * @param {LocalSearchType} type - 搜索类型
   * @returns {string} 缓存键
   */
  const generateCacheKey = (query: string, type: LocalSearchType): string => {
    return `${type}:${query.toLowerCase()}`
  }

  /**
   * 设置缓存
   *
   * 执行流程：
   * 1. 检查缓存容量
   * 2. 如果满了，删除最旧的项
   * 3. 添加新的缓存项
   *
   * @param {string} key - 缓存键
   * @param {any} results - 搜索结果
   */
  const setCache = (key: string, results: any) => {
    // 如果缓存已满，删除最旧的项
    if (searchCache.size >= maxCacheSize) {
      const firstKey = searchCache.keys().next().value
      searchCache.delete(firstKey)
    }
    searchCache.set(key, results)
  }

  /**
   * 清除缓存
   */
  const clearCache = () => {
    console.log('useLocalSearch: 清除搜索缓存')
    searchCache.clear()
  }

  // ========== 返回接口 ==========

  return {
    // 状态
    query,
    searchType,
    results,
    isLoading,
    isLoadingMore,
    hasResults,
    stats,
    searchHistory,
    pagination,

    // 方法
    switchSearchType,
    search,
    loadMore,
    clearSearch,
    reset,
    searchFromHistory,
    removeFromHistory,
    clearHistory,

    // 搜索类型枚举
    LocalSearchType,
  }
}
