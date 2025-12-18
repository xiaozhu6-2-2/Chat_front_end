/**
 * 搜索功能 Composable
 *
 * 功能：
 * - 封装搜索相关的业务逻辑
 * - 提供防抖搜索功能
 * - 管理搜索类型切换
 * - 处理用户交互反馈
 * - 作为模块的统一门面接口
 *
 * 使用示例：
 * ```typescript
 * const {
 *   query,
 *   searchType,
 *   results,
 *   search,
 *   clearSearch
 * } = useSearch();
 *
 * // 搜索用户
 * searchType.value = SearchType.USER;
 * await search('username');
 * ```
 */

import { computed, ref } from 'vue'
import { useSnackbar } from '@/composables/useSnackbar'
import { searchService } from '@/service/searchService'
import { useSearchStore } from '@/stores/searchStore'
import { SearchType, transformGroupSearchResult, transformUserSearchResult } from '@/types/search'

/**
 * 搜索功能 Hook
 *
 * @param options 配置选项
 * @param options.defaultType 默认搜索类型
 * @param options.debounceDelay 防抖延迟时间（毫秒）
 * @returns 搜索功能对象
 */
export function useSearch (options: {
  defaultType?: SearchType
  debounceDelay?: number
} = {}) {
  // 配置选项
  const { defaultType = SearchType.USER, debounceDelay = 500 } = options

  // 依赖注入
  const searchStore = useSearchStore()
  const { showError, showSuccess } = useSnackbar()

  // 本地状态
  const query = ref('')
  const searchType = ref<SearchType>(defaultType)

  // 防抖定时器
  let debounceTimer: number | null = null

  // ========== 计算属性 ==========

  /**
   * 当前搜索结果
   */
  const results = computed(() => searchStore.currentResults)

  /**
   * 是否正在加载
   */
  const isLoading = computed(() => searchStore.isLoading)

  /**
   * 是否正在加载更多
   */
  const isLoadingMore = computed(() => searchStore.isLoadingMore)

  /**
   * 是否有更多结果
   */
  const hasMore = computed(() => searchStore.hasMoreResults)

  /**
   * 结果总数
   */
  const totalResults = computed(() => searchStore.totalResults)

  /**
   * 是否有结果
   */
  const hasResults = computed(() => searchStore.hasResults)

  /**
   * 分页信息
   */
  const pagination = computed(() => searchStore.currentPagination)

  // ========== 核心方法 ==========

  /**
   * 切换搜索类型
   *
   * 执行流程：
   * 1. 更新本地状态
   * 2. 同步到 store
   * 3. 如果有查询，重新搜索
   *
   * @param type 新的搜索类型
   */
  const switchSearchType = (type: SearchType) => {
    console.log('useSearch: 切换搜索类型', { from: searchType.value, to: type })

    searchType.value = type
    searchStore.setSearchType(type)

    // 如果当前有查询，自动重新搜索
    if (query.value && query.value.trim()) {
      performSearch(query.value)
    }
  }

  /**
   * 执行搜索（带防抖）
   *
   * 执行流程：
   * 1. 更新本地查询状态
   * 2. 清除之前的防抖定时器
   * 3. 检查查询是否为空
   * 4. 立即执行或设置防抖延迟
   *
   * @param searchQuery 搜索关键词
   * @param immediate 是否立即执行（不防抖）
   */
  const search = (searchQuery: string, immediate = false) => {
    query.value = searchQuery
    console.log('useSearch: 执行搜索请求', { query: searchQuery, immediate })

    // 清除之前的定时器
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
   * 1. 设置加载状态
   * 2. 调用 searchService 执行搜索
   * 3. 更新 store 中的搜索结果
   * 4. 处理错误和用户反馈
   *
   * 数据流：
   * - 输入：搜索关键词
   * - 处理：调用 service → 更新 store
   * - 输出：更新搜索结果状态
   * - 副作用：发送 HTTP 请求，显示用户反馈
   *
   * @param searchQuery 搜索关键词
   */
  const performSearch = async (searchQuery: string) => {
    try {
      console.log('useSearch: 执行搜索', {
        query: searchQuery,
        type: searchType.value,
      })

      // 确保搜索类型是同步的
      searchStore.setSearchType(searchType.value)
      searchStore.setQuery(searchQuery.trim())
      searchStore.setLoading(true)

      // 准备搜索参数
      const params = {
        query: searchQuery.trim(),
        limit: 20,
        offset: 0,
      }

      // 根据搜索类型调用相应的服务
      if (searchType.value === SearchType.USER) {
        const response = await searchService.searchUsers(params)
        // 转换 API 响应数据为标准格式
        const transformedUsers = response.users.map(u => transformUserSearchResult(u))
        const pagination = {
          current_page: response.current_page,
          total_pages: response.total_pages,
          total_items: response.total_items,
          hasMore: response.current_page < response.total_pages - 1,
        }
        // 更新 store 中的用户搜索结果
        searchStore.setUserSearchResults(transformedUsers, pagination)
      } else {
        const response = await searchService.searchGroups(params)
        // 转换 API 响应数据为标准格式
        const transformedGroups = response.groups.map(g => transformGroupSearchResult(g))
        const pagination = {
          current_page: response.current_page,
          total_pages: response.total_pages,
          total_items: response.total_items,
          hasMore: response.current_page < response.total_pages - 1,
        }
        // 更新 store 中的群聊搜索结果
        searchStore.setGroupSearchResults(transformedGroups, pagination)
      }

      // 如果有结果，显示成功提示
      if (totalResults.value > 0) {
        console.log(`useSearch: 搜索成功 - 找到 ${totalResults.value} 个结果`)
      }
    } catch (error) {
      console.error('useSearch: 搜索失败', error)
      showError('搜索失败，请重试')
    } finally {
      searchStore.setLoading(false)
    }
  }

  /**
   * 加载更多结果
   *
   * 执行流程：
   * 1. 检查是否可以加载更多
   * 2. 设置加载更多状态
   * 3. 调用 searchService 加载更多数据
   * 4. 追加到 store 中的现有结果
   * 5. 更新分页信息
   *
   * @param limit 每页数量（可选）
   */
  const loadMore = async (limit?: number) => {
    if (!hasMore.value || isLoadingMore.value) {
      console.log('useSearch: 无法加载更多', { hasMore: hasMore.value, isLoadingMore: isLoadingMore.value })
      return
    }

    try {
      console.log('useSearch: 加载更多结果')

      searchStore.setLoadingMore(true)

      // 计算下一页的偏移量
      const limitValue = limit ?? 20
      const pagination = searchStore.currentPagination
      const params = {
        query: searchStore.state.query,
        limit: limitValue,
        offset: (pagination.current_page + 1) * limitValue,
      }

      // 根据搜索类型调用相应的服务
      if (searchType.value === SearchType.USER) {
        const response = await searchService.searchUsers(params)
        // 转换 API 响应数据为标准格式
        const transformedUsers = response.users.map(u => transformUserSearchResult(u))
        const pagination = {
          current_page: response.current_page,
          total_pages: response.total_pages,
          total_items: response.total_items,
          hasMore: response.current_page < response.total_pages - 1,
        }
        // 追加到 store 中的用户搜索结果
        searchStore.appendUserSearchResults(transformedUsers, pagination)
      } else {
        const response = await searchService.searchGroups(params)
        // 转换 API 响应数据为标准格式
        const transformedGroups = response.groups.map(g => transformGroupSearchResult(g))
        const pagination = {
          current_page: response.current_page,
          total_pages: response.total_pages,
          total_items: response.total_items,
          hasMore: response.current_page < response.total_pages - 1,
        }
        // 追加到 store 中的群聊搜索结果
        searchStore.appendGroupSearchResults(transformedGroups, pagination)
      }
    } catch (error) {
      console.error('useSearch: 加载更多失败', error)
      showError('加载更多失败，请重试')
    } finally {
      searchStore.setLoadingMore(false)
    }
  }

  /**
   * 清除搜索
   *
   * 使用场景：
   * - 搜索框被清空时
   * - 手动清除结果时
   */
  const clearSearch = () => {
    console.log('useSearch: 清除搜索')
    query.value = ''

    // 清除防抖定时器
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }

    // 清除搜索结果
    searchStore.clearResults()
  }

  /**
   * 重置搜索状态
   *
   * 使用场景：
   * - 组件卸载时
   * - 用户登出时
   */
  const reset = () => {
    console.log('useSearch: 重置搜索状态')
    clearSearch()
    searchType.value = defaultType
    searchStore.setSearchType(defaultType)
    searchStore.reset()
  }

  // ========== 返回接口 ==========

  return {
    // 状态
    query,
    searchType,
    results,
    isLoading,
    isLoadingMore,
    hasMore,
    totalResults,
    hasResults,
    pagination,

    // 方法
    switchSearchType,
    search,
    loadMore,
    clearSearch,
    reset,

    // 搜索类型枚举（供模板使用）
    SearchType,
  }
}
