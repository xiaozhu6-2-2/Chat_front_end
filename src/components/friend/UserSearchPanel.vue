<template>

  <!-- 搜索框 -->
  <v-text-field
    v-model="searchQuery"
    class="search-input mb-2 ma-2"
    clearable
    :label="searchType === SearchType.USER ? '搜索用户（用户名、账号、邮箱）' : '搜索群组（群名称、群号）'"
    :loading="isLoading"
    prepend-inner-icon="mdi-magnify"
    variant="outlined"
    @input="handleSearchInput"
    @keyup.enter="performSearch"
  />

  <!-- 搜索类型切换 -->
  <div class="px-2 pb-2">
    <v-btn-toggle
      v-model="currentSearchType"
      class="w-100"
      divided
      mandatory
      variant="outlined"
      @update:model-value="handleSearchTypeChange"
    >
      <v-btn class="flex-grow-1" :value="SearchType.USER">
        <v-icon icon="mdi-account" start />
        用户
      </v-btn>
      <v-btn class="flex-grow-1" :value="SearchType.GROUP">
        <v-icon icon="mdi-account-group" start />
        群组
      </v-btn>
    </v-btn-toggle>
  </div>
  <div class="search-panel">
    <!-- 搜索结果 -->
    <v-container v-if="searchResults.length > 0" class="pa-0">
      <!-- 用户搜索结果 -->
      <!-- 忽略报错 -->
      <v-row v-if="searchType === SearchType.USER">
        <v-col
          v-for="user in searchResults"
          :key="user.uid"
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

      <!-- 群组搜索结果 -->
      <!-- 忽略报错 -->
      <v-row v-else-if="searchType === SearchType.GROUP">
        <v-col
          v-for="group in searchResults"
          :key="group.gid"
          cols="12"
          md="4"
          sm="6"
        >
          <GroupSearchResultCard
            :group="group"
            @join-group="handleJoinGroup"
          />
        </v-col>
      </v-row>
    </v-container>

    <!-- 空状态 -->
    <div v-else-if="searchQuery && !isLoading" class="text-center py-8">
      <v-icon
        color="grey-lighten-1"
        :icon="searchType === SearchType.USER ? 'mdi-account-search' : 'mdi-account-group-search'"
        size="64"
      />
      <p class="text-grey mt-4">
        {{ searchQuery.length > 0
          ? (searchType === SearchType.USER ? '未找到匹配的用户' : '未找到匹配的群组')
          : (searchType === SearchType.USER ? '请输入关键词搜索用户' : '请输入关键词搜索群组')
        }}
      </p>
    </div>

    <!-- 加载状态 -->
    <div v-else-if="isLoading" class="text-center py-8">
      <v-progress-circular color="primary" indeterminate />
      <p class="text-grey mt-4">搜索中...</p>
    </div>

    <!-- 初始状态 -->
    <div v-else class="text-center py-8">
      <v-icon
        color="grey-lighten-1"
        :icon="searchType === SearchType.USER ? 'mdi-account-search-outline' : 'mdi-account-group-outline'"
        size="64"
      />
      <p class="text-grey mt-4">
        {{ searchType === SearchType.USER
          ? '输入用户名、账号或邮箱来搜索用户'
          : '输入群名称或群号来搜索群组'
        }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
  import type { GroupSearchResult, UserSearchResult } from '../../types/search'
  import { ref, watch } from 'vue'
  import { useFriendRequest } from '../../composables/useFriendRequest'
  import { useGroupRequest } from '../../composables/useGroupRequest'
  import { useSearch } from '../../composables/useSearch'
  import GroupSearchResultCard from './GroupSearchResultCard.vue'
  import UserSearchResultCard from './UserSearchResultCard.vue'

  const {
    search,
    results,
    isLoading,
    query,
    searchType,
    switchSearchType,
    SearchType,
  } = useSearch()

  const { sendFriendRequest } = useFriendRequest()
  const { sendGroupRequest } = useGroupRequest()

  // 用于 v-model 的本地引用
  const currentSearchType = ref(searchType.value)

  // 监听 searchType 变化
  watch(searchType, newType => {
    currentSearchType.value = newType
  })

  // 处理搜索类型切换
  function handleSearchTypeChange (newType: SearchType) {
    switchSearchType(newType)
  }

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

  // 申请加入群组
  async function handleJoinGroup (group: GroupSearchResult, success: boolean) {
    // 成功或失败的处理逻辑已经在 GroupSearchResultCard 中处理
    // 这里可以添加额外的逻辑，比如刷新搜索结果等
    console.log('UserSearchPanel: 群组申请结果', {
      groupId: group.gid,
      groupName: group.group_name,
      success,
    })
  }
</script>

<style scoped>
.search-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: auto;
}

.search-input,
.v-btn-toggle {
  flex-shrink: 0;
}

.v-container {
  flex: 1;
  overflow-y: auto;
}

.w-100 {
  width: 100% !important;
}

/* .search-input{
  height: 50px !important;
} */
</style>
