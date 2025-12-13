<template>
  <!-- 搜索框 -->
    <v-text-field
      v-model="searchQuery"
      label="搜索用户（用户名、账号、邮箱）"
      prepend-inner-icon="mdi-magnify"
      variant="outlined"
      clearable
      class="search-input mb-4 ma-2"
      :loading="isLoading"
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
          sm="6"
          md="4"
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
      <v-icon icon="mdi-account-search" size="64" color="grey-lighten-1"></v-icon>
      <p class="text-grey mt-4">
        {{ searchQuery.length > 0 ? '未找到匹配的用户' : '请输入关键词搜索用户' }}
      </p>
    </div>

    <!-- 加载状态 -->
    <div v-else-if="isLoading" class="text-center py-8">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
      <p class="text-grey mt-4">搜索中...</p>
    </div>

    <!-- 初始状态 -->
    <div v-else class="text-center py-8">
      <v-icon icon="mdi-account-search-outline" size="64" color="grey-lighten-1"></v-icon>
      <p class="text-grey mt-4">输入用户名、账号或邮箱来搜索用户</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useFriend } from '@/composables/useFriend'
import { useRequestAndSearch } from '@/composables/useRequestAndSearch'
import UserSearchResultCard from './UserSearchResultCard.vue'
import type { UserSearchResult } from '@/service/messageTypes'

const {
  searchQuery,
  searchResults,
  isLoading,
  searchUsers,
  debouncedSearch,
  sendFriendRequest
} = useRequestAndSearch()

// 搜索防抖
const handleSearchInput = () => {
  if (searchQuery.value) {
    debouncedSearch(searchQuery.value)
  } else {
    searchUsers('')
  }
}

// 执行搜索（回车时）
const performSearch = () => {
  if (searchQuery.value) {
    searchUsers(searchQuery.value)
  }
}

// 发送好友请求
const handleSendRequest = async (user: UserSearchResult, message?: string, tags?: string[]) => {
  try {
    await sendFriendRequest(user.uid, message, tags)
    // 这里可以添加成功提示
    console.log('好友请求发送成功', { tags })
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