<template>
  <v-card class="friend-card mb-2" elevation="1">
    <v-card-text class="pa-3">
      <div class="d-flex align-center">
        <!-- 用户头像 -->
        <v-avatar :image="friend.user_info.avatar" size="40" class="mr-3 flex-shrink-0">
          <v-icon v-if="!friend.user_info.avatar" icon="mdi-account" size="20"></v-icon>
        </v-avatar>

        <!-- 用户信息 -->
        <div class="flex-grow-1">
          <div class="d-flex align-center mb-1">
            <h4 class="text-subtitle-1 font-weight-medium mr-2">
              {{ displayName }}
            </h4>
            <!-- 黑名单标记 -->
            <v-chip v-if="friend.is_blacklist" color="error" size="x-small">
              <v-icon icon="mdi-block-helper" size="12" class="mr-1"></v-icon>
              黑名单
            </v-chip>
          </div>

          <!-- 备注和账号 -->
          <div class="d-flex align-center mb-1">
            <p v-if="friend.remark" class="text-body-2 text-primary mr-3">
              {{ friend.remark }}
            </p>
            <p class="text-caption text-grey">
              @{{ friend.user_info.account }}
            </p>
          </div>

          <!-- 地区和状态 -->
          <div class="d-flex align-center">
            <p v-if="friend.user_info.region" class="text-caption text-grey mr-3">
              <v-icon icon="mdi-map-marker" size="12" class="mr-1"></v-icon>
              {{ friend.user_info.region }}
            </p>
            <p class="text-caption text-grey">
              {{ formatJoinTime() }}
            </p>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="d-flex flex-column gap-1">
          <v-btn
            v-if="!friend.is_blacklist"
            color="primary"
            variant="text"
            size="small"
            @click="$emit('chat', friend)"
          >
            <v-icon icon="mdi-message" size="18"></v-icon>
          </v-btn>

          <v-menu>
            <template v-slot:activator="{ props }">
              <v-btn
                icon="mdi-dots-vertical"
                variant="text"
                size="small"
                v-bind="props"
              />
            </template>

            <v-list>
              <!-- 编辑备注 -->
              <v-list-item @click="$emit('edit-remark', friend)">
                <template v-slot:prepend>
                  <v-icon icon="mdi-pencil"></v-icon>
                </template>
                <v-list-item-title>编辑备注</v-list-item-title>
              </v-list-item>

              <!-- 设置标签 -->
              <v-list-item @click="$emit('set-tag', friend)">
                <template v-slot:prepend>
                  <v-icon icon="mdi-tag"></v-icon>
                </template>
                <v-list-item-title>设置标签</v-list-item-title>
              </v-list-item>

              <v-divider></v-divider>

              <!-- 黑名单操作 -->
              <v-list-item
                v-if="!friend.is_blacklist"
                @click="$emit('set-blacklist', friend, true)"
              >
                <template v-slot:prepend>
                  <v-icon icon="mdi-block-helper" color="warning"></v-icon>
                </template>
                <v-list-item-title>加入黑名单</v-list-item-title>
              </v-list-item>

              <v-list-item
                v-else
                @click="$emit('set-blacklist', friend, false)"
              >
                <template v-slot:prepend>
                  <v-icon icon="mdi-block-helper" color="success"></v-icon>
                </template>
                <v-list-item-title>移出黑名单</v-list-item-title>
              </v-list-item>

              <v-divider></v-divider>

              <!-- 删除好友 -->
              <v-list-item @click="$emit('remove', friend)">
                <template v-slot:prepend>
                  <v-icon icon="mdi-delete" color="error"></v-icon>
                </template>
                <v-list-item-title>删除好友</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FriendCardProps, FriendCardEmits } from '@/types/componentProps'

const props = defineProps<FriendCardProps>()
const emit = defineEmits<FriendCardEmits>()

// 显示名称（优先显示备注，其次显示用户名）
const displayName = computed(() => {
  return props.friend.remark || props.friend.user_info.username
})

// 格式化加入时间
const formatJoinTime = () => {
  const date = new Date(props.friend.create_time)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return '今天添加'
  } else if (diffDays < 7) {
    return `${diffDays}天前添加`
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return `${weeks}周前添加`
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30)
    return `${months}个月前添加`
  } else {
    const years = Math.floor(diffDays / 365)
    return `${years}年前添加`
  }
}
</script>

<style scoped>
.friend-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
}

.friend-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.flex-shrink-0 {
  flex-shrink: 0;
}

.gap-1 {
  gap: 4px;
}
</style>