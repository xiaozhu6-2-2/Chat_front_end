<template>
  <v-card class="friend-request-item mb-3" elevation="1">
    <v-card-text class="pa-4">
      <div class="d-flex align-start">
        <!-- 用户头像 -->
        <v-avatar :image="getUserAvatar()" size="48" class="mr-3 flex-shrink-0">
          <v-icon v-if="!getUserAvatar()" icon="mdi-account" size="24"></v-icon>
        </v-avatar>

        <!-- 请求信息 -->
        <div class="flex-grow-1">
          <div class="d-flex align-center mb-2">
            <h3 class="text-subtitle-1 font-weight-medium mr-2">
              {{ getDisplayName() }}
            </h3>

            <!-- 请求状态 -->
            <v-chip
              :color="getStatusColor()"
              :variant="getStatusVariant()"
              size="small"
            >
              {{ getStatusText() }}
            </v-chip>
          </div>

          <!-- 申请消息 -->
          <p v-if="request.apply_text" class="text-body-2 text-grey-darken-1 mb-2">
            {{ request.apply_text }}
          </p>

          <!-- 请求时间 -->
          <p class="text-caption text-grey mb-3">
            {{ formatRequestTime() }}
          </p>

          <!-- 操作按钮（仅收到的待处理请求显示） -->
          <div v-if="type === 'received' && request.status === 'pending'" class="d-flex gap-2">
            <v-btn
              color="success"
              variant="elevated"
              size="small"
              class="ma-3"
              @click="$emit('accept', request)"
            >
              <v-icon icon="mdi-check" class="ma-1"></v-icon>
              接受
            </v-btn>

            <v-btn
              color="error"
              variant="outlined"
              size="small"
              class="ma-3"
              @click="$emit('reject', request)"
            >
              <v-icon icon="mdi-close" class="ma-1"></v-icon>
              拒绝
            </v-btn>
          </div>

          <!-- 已处理状态的提示 -->
          <div v-else-if="type === 'received'" class="d-flex align-center">
            <v-icon
              :icon="request.status === 'accepted' ? 'mdi-check-circle' : 'mdi-close-circle'"
              :color="request.status === 'accepted' ? 'success' : 'error'"
              size="20"
              class="mr-2"
            />
            <span class="text-body-2">
              {{ request.status === 'accepted' ? '已接受' : '已拒绝' }}
              <span v-if="request.handle_time">
                ({{ formatHandleTime() }})
              </span>
            </span>
          </div>

          <!-- 发送请求的状态 -->
          <div v-else-if="type === 'sent'" class="d-flex align-center">
            <v-icon
              :icon="getStatusIcon()"
              :color="getStatusColor()"
              size="20"
              class="mr-2"
            />
            <span class="text-body-2">
              {{ getStatusText() }}
              <span v-if="request.handle_time">
                ({{ formatHandleTime() }})
              </span>
            </span>
          </div>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import type { FriendRequestItemProps, FriendRequestItemEmits } from '@/types/componentProps'

const props = defineProps<FriendRequestItemProps>()
const emit = defineEmits<FriendRequestItemEmits>()

// 获取用户显示名称
const getDisplayName = () => {
  if (props.type === 'received') {
    return props.request.sender_info?.username || `用户${props.request.sender_uid}`
  } else {
    return `用户${props.request.receiver_uid}`
  }
}

// 获取用户头像
const getUserAvatar = () => {
  if (props.type === 'received') {
    return props.request.sender_info?.avatar
  }
  return null
}

// 获取状态颜色
const getStatusColor = () => {
  switch (props.request.status) {
    case 'pending':
      return 'warning'
    case 'accepted':
      return 'success'
    case 'rejected':
      return 'error'
    case 'expired':
      return 'grey'
    default:
      return 'grey'
  }
}

// 获取状态变体
const getStatusVariant = () => {
  switch (props.request.status) {
    case 'pending':
      return 'elevated'
    default:
      return 'flat'
  }
}

// 获取状态文本
const getStatusText = () => {
  switch (props.request.status) {
    case 'pending':
      return props.type === 'sent' ? '等待处理' : '待处理'
    case 'accepted':
      return '已接受'
    case 'rejected':
      return '已拒绝'
    case 'expired':
      return '已过期'
    default:
      return '未知状态'
  }
}

// 获取状态图标
const getStatusIcon = () => {
  switch (props.request.status) {
    case 'pending':
      return 'mdi-clock-outline'
    case 'accepted':
      return 'mdi-check-circle'
    case 'rejected':
      return 'mdi-close-circle'
    case 'expired':
      return 'mdi-timer-off'
    default:
      return 'mdi-help-circle'
  }
}

// 格式化请求时间
const formatRequestTime = () => {
  const date = new Date(props.request.create_time)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

  if (diffHours < 1) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    return `${diffMinutes}分钟前`
  } else if (diffHours < 24) {
    return `${diffHours}小时前`
  } else {
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}天前`
  }
}

// 格式化处理时间
const formatHandleTime = () => {
  if (!props.request.handle_time) return ''

  const date = new Date(props.request.handle_time)
  return date.toLocaleDateString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.friend-request-item {
  transition: transform 0.2s ease;
}

.friend-request-item:hover {
  transform: translateY(-1px);
}

.flex-shrink-0 {
  flex-shrink: 0;
}
</style>