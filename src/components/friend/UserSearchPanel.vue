<template>
  <!-- 搜索框 -->
  <v-text-field
    v-model="searchQuery"
    class="search-input mb-4 ma-2"
    clearable
    label="搜索用户（用户名、账号、邮箱）"
    :loading="isLoading"
    prepend-inner-icon="mdi-magnify"
    variant="outlined"
    @input="handleSearchInput"
    @keyup.enter="performSearch"
  />
  <div class="user-search-panel">

    <!-- 搜索结果 -->
    <v-container v-if="searchResults.length > 0" class="pa-0">
      <v-row>
        <v-col
          v-for="user in searchResults"
          cols="12"
          md="4"
          sm="6"
        >
          <UserSearchResultCard
            :user="user"
            @send-request="handleSendRequest"
          />
        </v-col>
      </v-row>
    </v-container>

    <!-- 空状态 -->
    <div v-else-if="searchQuery && !isLoading" class="text-center py-8">
      <v-icon color="grey-lighten-1" icon="mdi-account-search" size="64" />
      <p class="text-grey mt-4">
        {{ searchQuery.length > 0 ? '未找到匹配的用户' : '请输入关键词搜索用户' }}
      </p>
    </div>

    <!-- 加载状态 -->
    <div v-else-if="isLoading" class="text-center py-8">
      <v-progress-circular color="primary" indeterminate />
      <p class="text-grey mt-4">搜索中...</p>
    </div>

    <!-- 初始状态 -->
    <div v-else class="text-center py-8">
      <v-icon color="grey-lighten-1" icon="mdi-account-search-outline" size="64" />
      <p class="text-grey mt-4">输入用户名、账号或邮箱来搜索用户</p>
    </div>
  </div>
</template>

<script setup lang="ts">
  import type { UserSearchResult } from '@/types/search'
  import { useFriendRequest } from '@/composables/useFriendRequest'
  import { useSearch } from '@/composables/useSearch'
  import UserSearchResultCard from './UserSearchResultCard.vue'

  const { search, results, isLoading, query } = useSearch()
  const { sendFriendRequest } = useFriendRequest()

  // 变量映射以保持兼容性
  const searchQuery = query
  const searchResults = results

  // 搜索输入处理（使用 useSearch 内置的防抖）
  function handleSearchInput () {
    search(searchQuery.value)
  }

  // 执行搜索（回车时，立即执行不防抖）
  function performSearch () {
    if (searchQuery.value) {
      search(searchQuery.value, true) // immediate = true 立即执行
    }
  }

  // 发送好友请求
  async function handleSendRequest (user: UserSearchResult, message?: string) {
    try {
      await sendFriendRequest(user.uid, message || '想和你成为好友')
      // 这里可以添加成功提示
      console.log('好友请求发送成功')
    } catch (error) {
      console.error('发送好友请求失败:', error)
    // 这里可以添加错误提示
    }
  }
</script>

<style scoped>
.user-search-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.v-container {
  flex: 1;
  overflow-y: auto;
}

/* .search-input{
  height: 50px !important;
} */
</style>
