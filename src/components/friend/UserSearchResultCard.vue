<template>
  <v-card class="user-search-result-card" elevation="2">
    <v-card-text class="pa-4">
      <!-- 用户信息 -->
      <div class="d-flex align-center mb-3">
        <Avatar
          class="mr-3"
          :name="user.username || '用户'"
          :size="48"
          :url="user.avatar || undefined"
        />

        <div class="flex-grow-1">
          <h3 class="text-subtitle-1 font-weight-medium mb-1">
            {{ user.username }}
          </h3>
          <p class="text-caption text-grey mb-1">
            @{{ user.uid }}
          </p>
          <!-- <p v-if="user.region" class="text-caption text-grey">
            <v-icon class="mr-1" icon="mdi-map-marker" size="14" />
            {{ user.region }}
          </p> -->
        </div>

        <!-- 性别图标 -->
        <v-icon
          class="ml-2"
          :color="getGenderColor(user.gender)"
          :icon="getGenderIcon(user.gender)"
          size="20"
        />
      </div>

      <!-- 个人简介 -->
      <p v-if="user.bio" class="text-body-2 text-grey-darken-1 mb-3">
        {{ user.bio }}
      </p>

      <!-- 操作按钮 -->
      <div class="d-flex gap-2">
        <v-btn
          v-if="!checkUserRelation(user.uid).isFriend"
          class="ma-3"
          color="primary"
          size="small"
          variant="elevated"
          @click="showAddFriendModal = true"
        >
          <v-icon class="mr-1" icon="mdi-account-plus" />
          添加好友
        </v-btn>

        <v-btn
          v-else
          class="ma-3"
          color="success"
          disabled
          size="small"
          variant="outlined"
        >
          <v-icon class="mr-1" icon="mdi-account-check" />
          已是好友
        </v-btn>

        <v-btn
          class="ma-3"
          color="grey"
          size="small"
          variant="outlined"
          @click="showProfileDialog = true"
        >
          <v-icon class="mr-1" icon="mdi-account-details" />
          查看资料
        </v-btn>
      </div>
    </v-card-text>

    <!-- 添加好友对话框 -->
    <AddFriendModal
      v-model="showAddFriendModal"
      :user="{ id: user.uid, name: user.username, avatar: user.avatar || '' }"
      @send-request="handleSendRequest"
    />

    <!-- 用户资料对话框 -->
    <v-dialog v-model="showProfileDialog" max-width="500">
      <v-card>
        <v-card-title class="d-flex align-center">
          <Avatar
            class="mr-3"
            :name="user.username || '用户'"
            :size="40"
            :url="user.avatar || undefined"
          />
          {{ user.username }} 的资料
        </v-card-title>

        <v-card-text>
          <v-list>
            <v-list-item>
              <v-list-item-title>性别</v-list-item-title>
              <v-list-item-subtitle>{{ user.gender }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item v-if="user.bio">
              <v-list-item-title>个人简介</v-list-item-title>
              <v-list-item-subtitle>{{ user.bio }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn @click="showProfileDialog = false">
            关闭
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup lang="ts">
  import type { UserSearchResultCardEmits, UserSearchResultCardProps } from '../../types/friendRequest'
  import { ref } from 'vue'
  import { useFriend } from '../../composables/useFriend'

  const { checkUserRelation } = useFriend()

  const props = defineProps<UserSearchResultCardProps>()
  const emit = defineEmits<UserSearchResultCardEmits>()

  const showAddFriendModal = ref(false)
  const showProfileDialog = ref(false)

  // 获取性别图标
  function getGenderIcon (gender?: string) {
    switch (gender) {
      case 'male': {
        return 'mdi-gender-male'
      }
      case 'female': {
        return 'mdi-gender-female'
      }
      default: {
        return 'mdi-gender-male-female'
      }
    }
  }

  // 获取性别颜色
  function getGenderColor (gender?: string) {
    switch (gender) {
      case 'male': {
        return 'blue'
      }
      case 'female': {
        return 'pink'
      }
      default: {
        return 'grey'
      }
    }
  }

  // 发送好友请求
  function handleSendRequest (user: { id: string; name: string; avatar: string }, message: string, tags: string[]) {
    // 转换为原始用户对象格式
    emit('send-request', props.user, message, tags)
  }
</script>

<style scoped>
.user-search-result-card {
  transition: transform 0.2s ease;
}

.user-search-result-card:hover {
  transform: translateY(-2px);
}
</style>
