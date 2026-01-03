<template>
  <v-card class="friend-request-item mb-3" elevation="1">
    <v-card-text class="pa-4">
      <div class="d-flex align-start">
        <!-- 用户头像 -->
        <Avatar
          avatar-class="profile-avatar"
          :name="getDisplayName()"
          :size="48"
          :url="request.userProfile?.avatar || undefined"
        />

        <!-- 请求信息 -->
        <div class="flex-grow-1 ml-4">
          <div class="d-flex align-center mb-2">
            <h3 class="text-subtitle-1 font-weight-medium mr-2">
              {{ getDisplayName() }}
            </h3>

            <!-- 请求状态 -->
            <v-chip
              :color="getStatusColor()"
              size="small"
              :variant="getStatusVariant()"
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
              class="ma-3"
              color="success"
              size="small"
              variant="elevated"
              @click="$emit('accept', request)"
            >
              <v-icon class="ma-1" icon="mdi-check" />
              接受
            </v-btn>

            <v-btn
              class="ma-3"
              color="error"
              size="small"
              variant="outlined"
              @click="$emit('reject', request)"
            >
              <v-icon class="ma-1" icon="mdi-close" />
              拒绝
            </v-btn>
          </div>

          <!-- 已处理状态的提示 -->
          <div v-else-if="type === 'received'" class="d-flex align-center">
            <v-icon
              class="mr-2"
              :color="request.status === 'accepted' ? 'success' : 'error'"
              :icon="request.status === 'accepted' ? 'mdi-check-circle' : 'mdi-close-circle'"
              size="20"
            />
            <span class="text-body-2">
              {{ request.status === 'accepted' ? '已接受' : '已拒绝' }}
              <span v-if="request.create_time">
                ({{ formatHandleTime() }})
              </span>
            </span>
          </div>

          <!-- 发送请求的状态 -->
          <div v-else-if="type === 'sent'" class="d-flex align-center">
            <v-icon
              class="mr-2"
              :color="getStatusColor()"
              :icon="getStatusIcon()"
              size="20"
            />
            <span class="text-body-2">
              {{ getStatusText() }}
              <span v-if="request.create_time">
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
  import type { FriendRequestItemEmits, FriendRequestItemProps } from '../../types/friendRequest'

  const props = defineProps<FriendRequestItemProps>()
  const emit = defineEmits<FriendRequestItemEmits>()

  // 获取用户显示名称
  function getDisplayName () {
    return props.request.userProfile?.name || `用户${props.request.userProfile?.id || ''}`
  }

  // 获取状态颜色
  function getStatusColor () {
    switch (props.request.status) {
      case 'pending': {
        return 'warning'
      }
      case 'accepted': {
        return 'success'
      }
      case 'rejected': {
        return 'error'
      }
      case 'expired': {
        return 'grey'
      }
      default: {
        return 'grey'
      }
    }
  }

  // 获取状态变体
  function getStatusVariant () {
    switch (props.request.status) {
      case 'pending': {
        return 'elevated'
      }
      default: {
        return 'flat'
      }
    }
  }

  // 获取状态文本
  function getStatusText () {
    switch (props.request.status) {
      case 'pending': {
        return props.type === 'sent' ? '等待处理' : '待处理'
      }
      case 'accepted': {
        return '已接受'
      }
      case 'rejected': {
        return '已拒绝'
      }
      case 'expired': {
        return '已过期'
      }
      default: {
        return '未知状态'
      }
    }
  }

  // 获取状态图标
  function getStatusIcon () {
    switch (props.request.status) {
      case 'pending': {
        return 'mdi-clock-outline'
      }
      case 'accepted': {
        return 'mdi-check-circle'
      }
      case 'rejected': {
        return 'mdi-close-circle'
      }
      case 'expired': {
        return 'mdi-timer-off'
      }
      default: {
        return 'mdi-help-circle'
      }
    }
  }

  // 格式化请求时间
  function formatRequestTime () {
    const date = new Date(props.request.create_time * 1000)
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
  function formatHandleTime () {
    if (!props.request.create_time) return ''

    const date = new Date(props.request.create_time * 1000)
    return date.toLocaleDateString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
